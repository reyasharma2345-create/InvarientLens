#!/usr/bin/env python3
import http.server
import socketserver
import json
import sys
import os

# Load .env variables if present
from dotenv import load_dotenv
load_dotenv()

# Add current dir to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from simulator.message_bus import MessageBus
from services import create_services, BUG_FLAGS
from invariants import InvariantRegistry
from detection import DetectorPipeline
from diagnosis import NemotronDiagnosisEngine

PORT = 8000

class InvariantLensHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        try:
            data = json.loads(body) if body else {}
        except Exception:
            data = {}

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        if self.path == "/api/simulate":
            seed = data.get("seed", 42)
            stock = data.get("stock", {"SKU-A": 0})
            active_bugs = data.get("active_bugs", [])
            num_orders = data.get("num_orders", 1)

            for k in BUG_FLAGS:
                BUG_FLAGS[k] = False
            for b in active_bugs:
                if b in BUG_FLAGS:
                    BUG_FLAGS[b] = True

            bus = MessageBus(seed=seed)
            orders, payments, inventory = create_services(bus, stock)

            for i in range(num_orders):
                orders.place_order(f"order-{i}", list(stock.keys())[0], f"customer-{i}")

            bus.run_until_quiescence()

            all_events = []
            for trace_id, events in bus.delivered_events.items():
                all_events.extend(events)
            all_events.sort(key=lambda e: e.delivery_seq)

            registry = InvariantRegistry(stock)
            trace_closed_map = {f"order-{i}": True for i in range(num_orders)}
            violations = registry.evaluate_all(all_events, trace_closed_map)

            response = {
                "seed": seed,
                "active_bugs": active_bugs,
                "total_events": len(all_events),
                "events": [e.model_dump(mode="json") for e in all_events],
                "violations": [
                    {
                        "invariant_id": v.invariant_id,
                        "verdict": v.verdict.value,
                        "description": f"{v.invariant_id} violation",
                    }
                    for v in violations
                ]
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))

        elif self.path == "/api/diagnose":
            seed = data.get("seed", 42)
            stock = data.get("stock", {"SKU-A": 0})
            active_bugs = data.get("active_bugs", [])

            for k in BUG_FLAGS:
                BUG_FLAGS[k] = False
            for b in active_bugs:
                if b in BUG_FLAGS:
                    BUG_FLAGS[b] = True

            bus = MessageBus(seed=seed)
            orders, payments, inventory = create_services(bus, stock)
            orders.place_order("order-1", list(stock.keys())[0], "customer-1")
            bus.run_until_quiescence()

            all_events = []
            for trace_id, events in bus.delivered_events.items():
                all_events.extend(events)
            all_events.sort(key=lambda e: e.delivery_seq)

            registry = InvariantRegistry(stock)
            trace_closed_map = {"order-1": True}

            pipeline = DetectorPipeline(registry)
            diagnosis_results = pipeline.run(all_events, trace_closed_map)

            engine = NemotronDiagnosisEngine()
            diagnoses = []

            for dr in diagnosis_results:
                ai_diagnosis = engine.diagnose(dr, all_events)
                diagnoses.append({
                    "violation": dr.violation.invariant_id,
                    "verdict": dr.violation.verdict.value,
                    "divergence_service": dr.divergence.service.value,
                    "expected_obligation": dr.divergence.expected_obligation,
                    "ai_analysis": ai_diagnosis
                })

            response = {
                "seed": seed,
                "active_bugs": active_bugs,
                "diagnoses": diagnoses
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            self.wfile.write(json.dumps({"error": "not found"}).encode('utf-8'))

    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({"project": "InvariantLens", "status": "operational"}).encode('utf-8'))

if __name__ == "__main__":
    with socketserver.TCPServer(("127.0.0.1", PORT), InvariantLensHandler) as httpd:
        print(f"Serving InvariantLens API on port {PORT}")
        httpd.serve_forever()
