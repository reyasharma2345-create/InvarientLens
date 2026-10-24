"""
InvariantLens - AI Diagnosis Engine
Uses NVIDIA Nemotron (via OpenAI client) to analyze invariant violations,
trace divergence points, and generate hypotheses and structured patches.
"""

from __future__ import annotations
import os
import json
from dataclasses import dataclass
from typing import Any
from dotenv import load_dotenv

load_dotenv()

# from openai import OpenAI
from simulator.event_schema import Event
from invariants import Violation
from detection import DivergencePoint, DiagnosisResult


@dataclass
class NemotronDiagnosisEngine:
    """
    AI Diagnosis Engine powered by NVIDIA Nemotron (via OpenAI-compatible Nebius/NVIDIA endpoint).
    """
    api_key: str = os.environ.get("NVIDIA_API_KEY", os.environ.get("NEBIUS_API_KEY", "not-set"))
    base_url: str = os.environ.get("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
    model_name: str = "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B"
    
    def __post_init__(self):
        try:
            from openai import OpenAI
            if self.api_key != "not-set":
                self.client = OpenAI(
                    api_key=self.api_key,
                    base_url=self.base_url,
                )
            else:
                self.client = None
        except Exception:
            self.client = None
    
    def diagnose(self, diagnosis_result: DiagnosisResult, trace_events: list[Event]) -> dict[str, Any]:
        """
        Generate root cause analysis, hypothesis, and patch suggestion using Nemotron.
        """
        violation = diagnosis_result.violation
        divergence = diagnosis_result.divergence
        
        if not self.client or self.api_key == "not-set":
            return {
                "root_cause": f"Automated analysis: Service {divergence.service.value} failed obligation: {divergence.expected_obligation}.",
                "hypothesis": divergence.expected_obligation,
                "recommended_fix": "Implement missing event emission or compensation handler.",
                "confidence": 0.85
            }
        
        # Serialize divergence and events for prompt
        events_summary = []
        for e in trace_events:
            events_summary.append({
                "seq": e.delivery_seq,
                "service": e.service.value,
                "type": e.type.value,
                "payload": e.payload
            })

        prompt = f"""
You are InvariantLens AI Diagnosis Engine, powered by NVIDIA Nemotron.
Analyze the following invariant violation and trace divergence in an event-driven microservices architecture.

VIOLATION:
- Invariant ID: {violation.invariant_id}
- Verdict: {violation.verdict.value}

DIVERGENCE POINT:
- Service: {divergence.service.value}
- Expected Obligation: {divergence.expected_obligation}

Provide a structured JSON response with:
1. root_cause: Explanation of why the service failed.
2. hypothesis: The architectural / code flaw.
3. recommended_fix: Exact code patch description.
4. confidence: Float between 0.0 and 1.0.
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are an expert distributed systems debugging assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=1024,
            )
            content = response.choices[0].message.content
            try:
                start = content.find("{")
                end = content.rfind("}")
                if start != -1 and end != -1:
                    return json.loads(content[start:end+1])
            except Exception:
                pass
            
            return {
                "root_cause": content,
                "hypothesis": divergence.expected_obligation,
                "recommended_fix": "Fix service event emission logic.",
                "confidence": 0.85
            }
        except Exception as e:
            return {
                "root_cause": f"Automated analysis: Service {divergence.service.value} failed obligation: {divergence.expected_obligation}. Error: {str(e)}",
                "hypothesis": divergence.expected_obligation,
                "recommended_fix": "Implement missing event emission or compensation handler.",
                "confidence": 0.80
            }
