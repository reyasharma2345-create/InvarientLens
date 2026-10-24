"""
InvariantLens - FastAPI Backend
Exposes endpoints for simulation, verification, Nemotron diagnosis, and benchmark runs.
"""

from __future__ import annotations
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Optional

from simulator.event_schema import Event
from simulator.message_bus import MessageBus
from services import create_services, BUG_FLAGS
from invariants import InvariantRegistry
from detection import DetectorPipeline
from diagnosis import NemotronDiagnosisEngine
from verifier import VerificationRunner

app = FastAPI(
    title="InvariantLens API",
    description="Verification-first debugging pipeline for event-driven systems (Nebius × NVIDIA Hackathon 2026)",
    version="1.0.0"
)

class SimulateRequest(BaseModel):
    seed: int = 42
    stock: dict[str, int] = {"SKU-A": 5}
    active_bugs: list[str] = []
    num_orders: int = 1

class DiagnoseRequest(BaseModel):
    seed: int = 42
    stock: dict[str, int] = {"SKU-A": 5}
    active_bugs: list[str] = []

@app.get("/")
def read_root():
    return {
        "project": "InvariantLens",
        "status": "operational",
        "hackathon": "Nebius × NVIDIA Global AI Hackathon 2026",
        "track": "Coding and Agentic Engineering"
    }

@app.post("/api/simulate")
def simulate_trace(req: SimulateRequest):
    # Reset bug flags
    for k in BUG_FLAGS:
        BUG_FLAGS[k] = False
    for b in req.active_bugs:
        if b in BUG_FLAGS:
            BUG_FLAGS[b] = True
            
    bus = MessageBus(seed=req.seed)
    orders, payments, inventory = create_services(bus, req.stock)
    
    for i in range(req.num_orders):
        orders.place_order(f"order-{i}", list(req.stock.keys())[0], f"customer-{i}")
        
    bus.run_until_quiescence()
    
    all_events = []
    for trace_id, events in bus.delivered_events.items():
        all_events.extend(events)
    all_events.sort(key=lambda e: e.delivery_seq)
    
    registry = InvariantRegistry(req.stock)
    trace_closed_map = {f"order-{i}": True for i in range(req.num_orders)}
    violations = registry.evaluate_all(all_events, trace_closed_map)
    
    return {
        "seed": req.seed,
        "active_bugs": req.active_bugs,
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

@app.post("/api/diagnose")
def diagnose_violations(req: DiagnoseRequest):
    for k in BUG_FLAGS:
        BUG_FLAGS[k] = False
    for b in req.active_bugs:
        if b in BUG_FLAGS:
            BUG_FLAGS[b] = True
            
    bus = MessageBus(seed=req.seed)
    orders, payments, inventory = create_services(bus, req.stock)
    orders.place_order("order-1", list(req.stock.keys())[0], "customer-1")
    bus.run_until_quiescence()
    
    all_events = []
    for trace_id, events in bus.delivered_events.items():
        all_events.extend(events)
    all_events.sort(key=lambda e: e.delivery_seq)
    
    registry = InvariantRegistry(req.stock)
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
        
    return {
        "seed": req.seed,
        "active_bugs": req.active_bugs,
        "diagnoses": diagnoses
    }
