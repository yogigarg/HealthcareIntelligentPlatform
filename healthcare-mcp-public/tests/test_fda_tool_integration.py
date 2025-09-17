import os
import pytest
from src.tools.fda_tool import FDATool
import asyncio

@pytest.mark.asyncio
async def test_lookup_drug_label_integration():
    """Integration test: fetch real label info for ibuprofen from FDA API"""
    tool = FDATool()
    result = await tool.lookup_drug("ibuprofen", "label")
    assert result["status"] == "success"
    assert result["drug_name"].lower() == "ibuprofen"
    assert isinstance(result["results"], list)
    assert result["total_results"] >= 1
    print("Sample result:", result["results"][0])
