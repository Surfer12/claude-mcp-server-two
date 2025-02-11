"""
Enhanced MCP Tools with multi-provider support and code analysis capabilities.
"""
import os
import time
import json
from typing import Any, Dict, List, Optional, Literal
from datetime import datetime
import asyncio
import logging
from pathlib import Path
import ast
import re

import anthropic
from anthropic.types import Message
import openai
from openai import AsyncOpenAI
import plotly.graph_objects as go
import pandas as pd
import networkx as nx

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ProviderType = Literal["anthropic", "openai", "auto"]

class CodeAnalyzer:
    """Code analysis tools for MCP server."""

    @staticmethod
    def analyze_complexity(code: str) -> Dict[str, Any]:
        """Analyze code complexity."""
        try:
            tree = ast.parse(code)

            # Initialize metrics
            metrics = {
                "num_functions": 0,
                "num_classes": 0,
                "lines_of_code": len(code.splitlines()),
                "complexity_score": 0,
                "imports": [],
                "function_names": [],
                "class_names": [],
            }

            # Collect imports
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for name in node.names:
                        metrics["imports"].append(name.name)
                elif isinstance(node, ast.ImportFrom):
                    module = node.module or ""
                    for name in node.names:
                        metrics["imports"].append(f"{module}.{name.name}")
                elif isinstance(node, ast.FunctionDef):
                    metrics["num_functions"] += 1
                    metrics["function_names"].append(node.name)
                    # Basic complexity scoring
                    metrics["complexity_score"] += len(list(ast.walk(node)))
                elif isinstance(node, ast.ClassDef):
                    metrics["num_classes"] += 1
                    metrics["class_names"].append(node.name)

            return {
                "success": True,
                "metrics": metrics
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def analyze_patterns(code: str) -> Dict[str, Any]:
        """Analyze code patterns and potential issues."""
        patterns = {
            "error_handling": len(re.findall(r'try|except|finally', code)),
            "async_code": len(re.findall(r'async|await', code)),
            "type_hints": len(re.findall(r':\s*[A-Za-z\[\]]+', code)),
            "docstrings": len(re.findall(r'"""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'', code)),
            "todo_comments": len(re.findall(r'#\s*TODO', code)),
            "magic_numbers": len(re.findall(r'\b\d+\b(?!\s*[=:]\s*[\'"]\w+)', code)),
        }

        return {
            "success": True,
            "patterns": patterns
        }

class ProviderSelector:
    """Provider selection and management for MCP server."""

    def __init__(self):
        self.anthropic_client = anthropic.Client(
            api_key=os.getenv("ANTHROPIC_API_KEY")
        )
        self.openai_client = AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )

    async def generate_code(
        self,
        prompt: str,
        provider: ProviderType = "auto",
        **kwargs
    ) -> Dict[str, Any]:
        """Generate code using specified provider."""
        try:
            if provider == "auto":
                # Simple provider selection based on prompt characteristics
                provider = self._select_provider(prompt)

            if provider == "anthropic":
                return await self._generate_anthropic(prompt, **kwargs)
            else:
                return await self._generate_openai(prompt, **kwargs)

        except Exception as e:
            logger.error(f"Code generation error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    def _select_provider(self, prompt: str) -> ProviderType:
        """Select best provider based on prompt characteristics."""
        # Simple heuristic-based selection
        if any(kw in prompt.lower() for kw in ["analyze", "explain", "understand"]):
            return "anthropic"  # Better for analysis and explanation
        return "openai"  # Better for direct code generation

    async def _generate_anthropic(
        self,
        prompt: str,
        temperature: float = 0.7,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate code using Anthropic's Claude."""
        try:
            message = await self.anthropic_client.messages.create(
                model="claude-3-opus-20240229",
                max_tokens=4096,
                temperature=temperature,
                messages=[{"role": "user", "content": prompt}]
            )

            return {
                "success": True,
                "provider": "anthropic",
                "generated_code": message.content[0].text if message.content else "",
                "model": "claude-3-opus-20240229"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _generate_openai(
        self,
        prompt: str,
        temperature: float = 0.7,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate code using OpenAI."""
        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": "You are a skilled programmer. Generate code based on the user's request."},
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature
            )

            return {
                "success": True,
                "provider": "openai",
                "generated_code": response.choices[0].message.content,
                "model": "gpt-4-turbo-preview"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

class MCPPerformanceMonitor:
    """Monitors and tracks MCP server performance metrics."""

    def __init__(self, data_dir: str = "monitoring_data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.metrics_file = self.data_dir / "performance_metrics.jsonl"
        self.current_session = datetime.now().isoformat()

    def log_metric(self, metric_type: str, value: Any, metadata: Optional[Dict] = None):
        """Log a performance metric."""
        metric = {
            "timestamp": datetime.now().isoformat(),
            "session_id": self.current_session,
            "type": metric_type,
            "value": value,
            "metadata": metadata or {}
        }

        with open(self.metrics_file, "a") as f:
            f.write(json.dumps(metric) + "\n")

    def get_metrics(self, metric_type: Optional[str] = None) -> pd.DataFrame:
        """Retrieve metrics as a pandas DataFrame."""
        metrics = []
        if self.metrics_file.exists():
            with open(self.metrics_file) as f:
                for line in f:
                    metric = json.loads(line)
                    if metric_type is None or metric["type"] == metric_type:
                        metrics.append(metric)
        return pd.DataFrame(metrics)

class MCPVisualizer:
    """Visualization tools for MCP server analytics."""

    def __init__(self, monitor: MCPPerformanceMonitor):
        self.monitor = monitor

    def create_performance_dashboard(self) -> Dict[str, go.Figure]:
        """Create a performance monitoring dashboard."""
        metrics_df = self.monitor.get_metrics()

        dashboard = {}

        # 1. Response time graph with moving average
        response_times = metrics_df[metrics_df["type"] == "response_time"]
        if not response_times.empty:
            response_fig = go.Figure()

            # Raw response times
            response_fig.add_trace(go.Scatter(
                x=pd.to_datetime(response_times["timestamp"]),
                y=response_times["value"],
                mode="lines+markers",
                name="Response Time"
            ))

            # Moving average
            window_size = 5
            moving_avg = response_times["value"].rolling(window=window_size).mean()
            response_fig.add_trace(go.Scatter(
                x=pd.to_datetime(response_times["timestamp"]),
                y=moving_avg,
                mode="lines",
                name=f"{window_size}-point Moving Average",
                line=dict(dash="dash")
            ))

            response_fig.update_layout(
                title="Response Times Over Time",
                xaxis_title="Timestamp",
                yaxis_title="Response Time (s)",
                hovermode="x unified"
            )
            dashboard["response_times"] = response_fig

        # 2. Tool usage sunburst chart
        tool_usage = metrics_df[metrics_df["type"] == "tool_usage"]
        if not tool_usage.empty:
            # Create hierarchical structure
            tool_hierarchy = {}
            for _, row in tool_usage.iterrows():
                tool_type = row["value"]
                metadata = row["metadata"]
                if tool_type not in tool_hierarchy:
                    tool_hierarchy[tool_type] = {"count": 0, "subtypes": {}}
                tool_hierarchy[tool_type]["count"] += 1

                # Add metadata-based subtypes
                if "status" in metadata:
                    status = metadata["status"]
                    if status not in tool_hierarchy[tool_type]["subtypes"]:
                        tool_hierarchy[tool_type]["subtypes"][status] = 0
                    tool_hierarchy[tool_type]["subtypes"][status] += 1

            # Convert to sunburst format
            labels = ["Tools"]  # Root
            parents = [""]  # Root has no parent
            values = [sum(d["count"] for d in tool_hierarchy.values())]  # Total count

            for tool, data in tool_hierarchy.items():
                labels.append(tool)
                parents.append("Tools")
                values.append(data["count"])

                for subtype, count in data["subtypes"].items():
                    labels.append(f"{tool}-{subtype}")
                    parents.append(tool)
                    values.append(count)

            usage_fig = go.Figure(go.Sunburst(
                labels=labels,
                parents=parents,
                values=values,
                branchvalues="total"
            ))
            usage_fig.update_layout(title="Tool Usage Distribution")
            dashboard["tool_usage"] = usage_fig

        # 3. Error rate timeline
        error_metrics = metrics_df[metrics_df["type"] == "command_received"].copy()
        if not error_metrics.empty:
            error_metrics["has_error"] = error_metrics["metadata"].apply(
                lambda x: x.get("status") == "error"
            )

            # Group by time intervals
            error_metrics["timestamp"] = pd.to_datetime(error_metrics["timestamp"])
            hourly_errors = error_metrics.set_index("timestamp").resample("1H").agg({
                "has_error": ["sum", "count"]
            })

            error_rate = (hourly_errors["has_error"]["sum"] /
                         hourly_errors["has_error"]["count"] * 100)

            error_fig = go.Figure()
            error_fig.add_trace(go.Scatter(
                x=error_rate.index,
                y=error_rate.values,
                mode="lines+markers",
                name="Error Rate",
                line=dict(color="red")
            ))

            error_fig.update_layout(
                title="Hourly Error Rate (%)",
                xaxis_title="Time",
                yaxis_title="Error Rate (%)",
                yaxis_range=[0, 100]
            )
            dashboard["error_rate"] = error_fig

        # 4. Performance heatmap
        if not response_times.empty:
            response_times["hour"] = pd.to_datetime(response_times["timestamp"]).dt.hour
            response_times["day"] = pd.to_datetime(response_times["timestamp"]).dt.day_name()

            # Create pivot table for heatmap
            heatmap_data = response_times.pivot_table(
                values="value",
                index="day",
                columns="hour",
                aggfunc="mean"
            )

            # Define day order
            day_order = ["Monday", "Tuesday", "Wednesday", "Thursday",
                        "Friday", "Saturday", "Sunday"]
            heatmap_data = heatmap_data.reindex(day_order)

            heatmap_fig = go.Figure(data=go.Heatmap(
                z=heatmap_data.values,
                x=heatmap_data.columns,
                y=heatmap_data.index,
                colorscale="Viridis",
                colorbar=dict(title="Avg Response Time (s)")
            ))

            heatmap_fig.update_layout(
                title="Response Time Heatmap by Hour and Day",
                xaxis_title="Hour of Day",
                yaxis_title="Day of Week"
            )
            dashboard["response_heatmap"] = heatmap_fig

        return dashboard

class MCPTools:
    """Enhanced MCP Tools with monitoring and visualization capabilities."""

    def __init__(self):
        self.monitor = MCPPerformanceMonitor()
        self.visualizer = MCPVisualizer(self.monitor)
        self.provider_selector = ProviderSelector()
        self.code_analyzer = CodeAnalyzer()

    async def process_command(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """Process an MCP command with performance monitoring."""
        start_time = time.time()
        command_type = command.get("type", "unknown")

        try:
            # Log the incoming command
            self.monitor.log_metric("command_received", command_type, {
                "command": command
            })

            # Process based on command type
            if command_type == "code_generation":
                result = await self._handle_code_generation(command)
            elif command_type == "code_analysis":
                result = await self._handle_code_analysis(command)
            elif command_type == "analysis":
                result = await self._handle_analysis(command)
            else:
                result = {"error": f"Unknown command type: {command_type}"}

            # Log performance metrics
            execution_time = time.time() - start_time
            self.monitor.log_metric("response_time", execution_time, {
                "command_type": command_type,
                "status": "success" if "error" not in result else "error"
            })

            return result

        except Exception as e:
            logger.error(f"Error processing command: {str(e)}")
            execution_time = time.time() - start_time
            self.monitor.log_metric("response_time", execution_time, {
                "command_type": command_type,
                "status": "error",
                "error": str(e)
            })
            return {"error": str(e)}

    async def _handle_code_generation(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """Handle code generation commands."""
        prompt = command.get("prompt")
        provider = command.get("provider", "auto")

        if not prompt:
            return {"error": "No prompt provided"}

        try:
            result = await self.provider_selector.generate_code(
                prompt=prompt,
                provider=provider,
                temperature=command.get("temperature", 0.7)
            )

            # Log tool usage
            self.monitor.log_metric("tool_usage", f"code_generation_{result['provider']}", {
                "prompt_length": len(prompt),
                "provider": result["provider"],
                "model": result["model"]
            })

            return result

        except Exception as e:
            logger.error(f"Code generation error: {str(e)}")
            return {"error": f"Code generation failed: {str(e)}"}

    async def _handle_code_analysis(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """Handle code analysis commands."""
        code = command.get("code")
        analysis_type = command.get("analysis_type", "all")

        if not code:
            return {"error": "No code provided"}

        try:
            results = {}

            if analysis_type in ["all", "complexity"]:
                results["complexity"] = self.code_analyzer.analyze_complexity(code)

            if analysis_type in ["all", "patterns"]:
                results["patterns"] = self.code_analyzer.analyze_patterns(code)

            # Log tool usage
            self.monitor.log_metric("tool_usage", "code_analysis", {
                "analysis_type": analysis_type,
                "code_length": len(code)
            })

            return {
                "success": True,
                "analysis": results
            }

        except Exception as e:
            logger.error(f"Code analysis error: {str(e)}")
            return {"error": f"Code analysis failed: {str(e)}"}

    async def _handle_analysis(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """Handle analysis commands."""
        analysis_type = command.get("analysis_type")
        data = command.get("data")

        if not analysis_type or not data:
            return {"error": "Missing analysis_type or data"}

        try:
            # Log tool usage
            self.monitor.log_metric("tool_usage", f"analysis_{analysis_type}", {
                "data_size": len(str(data))
            })

            if analysis_type == "performance":
                return {
                    "success": True,
                    "visualizations": self.visualizer.create_performance_dashboard()
                }
            else:
                return {"error": f"Unknown analysis type: {analysis_type}"}

        except Exception as e:
            logger.error(f"Analysis error: {str(e)}")
            return {"error": f"Analysis failed: {str(e)}"}

    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics and visualizations."""
        try:
            dashboard = self.visualizer.create_performance_dashboard()
            metrics_df = self.monitor.get_metrics()

            return {
                "success": True,
                "dashboard": dashboard,
                "metrics_summary": {
                    "total_commands": len(metrics_df),
                    "average_response_time": metrics_df[metrics_df["type"] == "response_time"]["value"].mean(),
                    "tool_usage_summary": metrics_df[metrics_df["type"] == "tool_usage"]["value"].value_counts().to_dict()
                }
            }
        except Exception as e:
            logger.error(f"Error getting performance metrics: {str(e)}")
            return {"error": f"Failed to get performance metrics: {str(e)}"}