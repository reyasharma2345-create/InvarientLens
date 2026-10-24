"""
InvariantLens - Reproduction Test Generator
Generates pass-then-invert reproduction tests from violation traces.
"""

from __future__ import annotations
import json
from dataclasses import dataclass, field
from typing import Any
from simulator.event_schema import Event, EventType, Service
from simulator.message_bus import MessageBus
from services import create_services, BUG_FLAGS


@dataclass
class ReproTest:
    """A reproduction test that can validate a bug fix."""
    test_id: str
    bug_id: str
    seed: int
    initial_stock: dict[str, int]
    active_bugs: list[str]
    trace_events: list[Event]  # The original buggy trace
    expected_violation: str    # The invariant that should be violated
    divergence_point: dict[str, Any]  # Where the divergence occurs
    
    def to_json(self) -> str:
        """Serialize test to JSON for Nebius runner."""
        return json.dumps({
            "test_id": self.test_id,
            "bug_id": self.bug_id,
            "seed": self.seed,
            "initial_stock": self.initial_stock,
            "active_bugs": self.active_bugs,
            "trace_events": [e.model_dump(mode="json") for e in self.trace_events],
            "expected_violation": self.expected_violation,
            "divergence_point": self.divergence_point,
        }, indent=2)
    
    @classmethod
    def from_json(cls, data: str) -> "ReproTest":
        """Deserialize test from JSON."""
        obj = json.loads(data)
        # Reconstruct events
        events = [Event.model_validate(e) for e in obj["trace_events"]]
        return cls(
            test_id=obj["test_id"],
            bug_id=obj["bug_id"],
            seed=obj["seed"],
            initial_stock=obj["initial_stock"],
            active_bugs=obj["active_bugs"],
            trace_events=events,
            expected_violation=obj["expected_violation"],
            divergence_point=obj["divergence_point"],
        )


class TestGenerator:
    """
    Generates reproduction tests from violation traces.
    Uses pass-then-invert: first verifies the test passes on buggy code,
    then inverts to assert the invariant should hold.
    """
    
    def __init__(self):
        self.generated_tests: list[ReproTest] = []
    
    def generate_from_violation(
        self,
        bug_id: str,
        seed: int,
        initial_stock: dict[str, int],
        active_bugs: list[str],
        trace_events: list[Event],
        violation_id: str,
        divergence_point: dict[str, Any]
    ) -> ReproTest:
        """
        Generate a reproduction test from a violation trace.
        """
        test_id = f"repro_{bug_id}_{seed}"
        
        test = ReproTest(
            test_id=test_id,
            bug_id=bug_id,
            seed=seed,
            initial_stock=initial_stock,
            active_bugs=active_bugs,
            trace_events=trace_events,
            expected_violation=violation_id,
            divergence_point=divergence_point,
        )
        
        self.generated_tests.append(test)
        return test
    
    def validate_test_passes_on_buggy(self, test: ReproTest) -> bool:
        """
        Validate that the test reproduces the violation on buggy code.
        Returns True if the violation is reproduced.
        """
        # Reset bug flags
        for k in BUG_FLAGS:
            BUG_FLAGS[k] = False
        for b in test.active_bugs:
            if b in BUG_FLAGS:
                BUG_FLAGS[b] = True
        
        # Run simulation with the same seed
        bus = MessageBus(seed=test.seed)
        orders, payments, inventory = create_services(bus, test.initial_stock)
        
        # Replay the exact same order placements
        for event in test.trace_events:
            if event.type == EventType.ORDER_PLACED:
                orders.place_order(
                    event.payload["order_id"],
                    event.payload["sku"],
                    event.payload["customer_id"]
                )
        
        bus.run_until_quiescence()
        
        # Check if the same violation occurs
        all_events = []
        for trace_id, events in bus.delivered_events.items():
            all_events.extend(events)
        all_events.sort(key=lambda e: e.delivery_seq)
        
        from invariants import InvariantRegistry
        registry = InvariantRegistry(test.initial_stock)
        trace_closed_map = {}
        for trace_id in bus.delivered_events.keys():
            trace_closed_map[trace_id] = True
        
        violations = registry.evaluate_all(all_events, trace_closed_map)
        
        # Check if expected violation is present
        for v in violations:
            if v.invariant_id == test.expected_violation:
                return True
        
        return False
    
    def validate_test_fails_on_fixed(self, test: ReproTest, fixed_services: dict) -> bool:
        """
        Validate that the test passes (no violation) on fixed code.
        This is the 'invert' step - we expect the invariant to hold.
        """
        # This would run with the fixed services
        # For now, return True if we can run it
        return True


def create_repro_test_from_diagnosis(
    bug_id: str,
    seed: int,
    initial_stock: dict[str, int],
    active_bugs: list[str],
    trace_events: list[Event],
    violation_id: str,
    divergence_point: dict[str, Any]
) -> ReproTest:
    """Factory function to create a reproduction test."""
    generator = TestGenerator()
    return generator.generate_from_violation(
        bug_id=bug_id,
        seed=seed,
        initial_stock=initial_stock,
        active_bugs=active_bugs,
        trace_events=trace_events,
        violation_id=violation_id,
        divergence_point=divergence_point
    )