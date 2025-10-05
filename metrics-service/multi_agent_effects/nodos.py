from langgraph.graph import StateGraph, END
from langgraph.types import Command
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, BaseMessage
from langchain.agents.format_scratchpad.openai_tools import format_to_openai_tool_messages
from langchain.agents.output_parsers.openai_tools import OpenAIToolsAgentOutputParser
from typing import List, Literal
from typing_extensions import Annotated
from langgraph.graph.message import add_messages
import concurrent.futures
from pydantic import BaseModel
from langchain_community.tools.tavily_search import TavilySearchResults

# === IMPORTA TUS TOOLS ===
from multi_agent_effects.effects_toolkit import effects_toolkit_tool
from multi_agent_effects.tools_effects import estimate_population_tool, map_context_tool


# === CONFIGURACIÓN DEL LLM ===
LLM = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)


# === ESTADO GLOBAL ===
class ImpactState(BaseModel):
    messages: Annotated[List[BaseMessage], add_messages]
    input: str | None = None


# === PROMPTS ===
effects_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "Eres un analista de impactos de asteroides. Dispones de herramientas para calcular energía, cráter, "
     "ondas de choque, radiación térmica y tsunamis. Usa las herramientas cuando sea necesario. "
     "Responde siempre en español, con explicaciones claras y numéricas."),
    ("human", "{input}")
])

population_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "Eres un experto en geodemografía. Estima la población afectada según la ubicación y el radio indicado. "
     "Usa la herramienta cuando sea necesario y responde en español con una breve justificación."),
    ("human", "{input}")
])

maps_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "Eres un analista geoespacial. Describe las áreas cercanas al punto del impacto. "
     "Si el usuario no proporciona latitud/longitud, solicítalas."),
    ("human", "{input}")
])

search_costs_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "Eres un experto en análisis de desastres. Usa herramientas de búsqueda para encontrar estimaciones "
     "de costes y daños sociales de impactos similares. Responde en español, citando fuentes si es posible."),
    ("human", "{input}")
])

supervisor_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "Eres un despachador inteligente de agentes especializados en impactos de asteroides. "
     "Tu tarea es decidir qué tipo de análisis se requiere según la pregunta del usuario. "
     "Responde SOLO con uno de estos valores exactos: "
     "'effects', 'population', 'maps', 'search_costs' o 'none'. "
     "Si la consulta es ambigua, responde 'none'. "
     "No des explicaciones."),
    ("human", "{input}")
])


# === CREACIÓN DE AGENTES BASADOS EN TOOL-CALLING NATIVO ===
def make_openai_tool_agent(llm, tools, prompt):
    """Crea un agente con soporte de tool-calling nativo (multi-input compatible)."""
    llm_with_tools = llm.bind_tools(tools)

    agent_prompt = ChatPromptTemplate.from_messages([
        ("system", prompt.messages[0].prompt.template if hasattr(prompt.messages[0], "prompt") else str(prompt.messages[0])),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    agent = (
        {
            "input": lambda x: x["input"],
            "chat_history": lambda x: x.get("chat_history", []),
            "agent_scratchpad": lambda x: format_to_openai_tool_messages(x.get("intermediate_steps", [])),
        }
        | agent_prompt
        | llm_with_tools
        | OpenAIToolsAgentOutputParser()
    )

    return AgentExecutor(agent=agent, tools=tools, verbose=False, handle_parsing_errors=True)


# === INSTANCIAS DE AGENTES ===
effects_agent = make_openai_tool_agent(LLM, [effects_toolkit_tool], effects_prompt)
population_agent = make_openai_tool_agent(LLM, [estimate_population_tool], population_prompt)
maps_agent = make_openai_tool_agent(LLM, [map_context_tool], maps_prompt)

tavily_tool = TavilySearchResults(max_results=3)
search_agent = make_openai_tool_agent(LLM, [tavily_tool], search_costs_prompt)

supervisor_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
supervisor_agent_llm = make_openai_tool_agent(supervisor_llm, [], supervisor_prompt)


# === FUNCIÓN SEGURA PARA INVOCAR AGENTES ===
def _safe_invoke(agent, query: str, timeout=40) -> str:
    try:
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(lambda: agent.invoke({"input": query}))
            result = future.result(timeout=timeout)
    except concurrent.futures.TimeoutError:
        return "⚠️ El agente tardó demasiado en responder."
    except Exception as e:
        return f"⚠️ Error ejecutando el agente: {e}"

    if not result:
        return "⚠️ No se obtuvo respuesta del agente."
    if isinstance(result, dict):
        return str(result.get("output") or result)
    if hasattr(result, "output"):
        return str(result.output)
    return str(result)


# === NODOS ===
def effects_node(state: ImpactState):
    query = state.messages[-1].content if state.messages else "Calcular efectos del impacto."
    text = _safe_invoke(effects_agent, query)
    if any(w in query.lower() for w in ["población", "habitantes", "densidad"]):
        new_msg = HumanMessage(content=f"{text}\n\nAhora estima la población afectada basándote en ese radio de daño.")
        return Command(update={"messages": new_msg}, goto="population")
    return Command(update={"messages": HumanMessage(content=text, name="effects")}, goto=END)


def population_node(state: ImpactState):
    query = state.messages[-1].content if state.messages else "Calcular población afectada."
    text = _safe_invoke(population_agent, query)
    return Command(update={"messages": HumanMessage(content=text, name="population")}, goto=END)


def maps_node(state: ImpactState):
    query = state.messages[-1].content if state.messages else "Describir el mapa del impacto."
    text = _safe_invoke(maps_agent, query)
    return Command(update={"messages": HumanMessage(content=text, name="maps")}, goto=END)


def search_costs_node(state: ImpactState):
    query = state.messages[-1].content if state.messages else "Buscar costes del impacto."
    text = _safe_invoke(search_agent, query)
    return Command(update={"messages": HumanMessage(content=text, name="search_costs")}, goto=END)


def supervisor_node(state: ImpactState) -> Command[Literal["effects", "population", "maps", "search_costs", END]]:
    query = state.messages[-1].content if state.messages else "Analizar impacto."
    try:
        decision = supervisor_agent_llm.invoke({"input": query})
        if isinstance(decision, dict):
            decision_text = str(decision.get("output", "")).strip().lower()
        else:
            decision_text = str(decision).strip().lower()
    except Exception:
        decision_text = "none"

    if "effects" in decision_text:
        return Command(goto="effects")
    elif "population" in decision_text:
        return Command(goto="population")
    elif "maps" in decision_text:
        return Command(goto="maps")
    elif "search_costs" in decision_text:
        return Command(goto="search_costs")
    else:
        clarification = HumanMessage(
            content="La consulta no es suficientemente clara. ¿Deseas calcular efectos físicos, población afectada, zonas geográficas o costes económicos?"
        )
        return Command(update={"messages": clarification}, goto=END)


# === GRAFO PRINCIPAL ===
graph = StateGraph(ImpactState)
graph.add_node("supervisor", supervisor_node)
graph.add_node("effects", effects_node)
graph.add_node("population", population_node)
graph.add_node("maps", maps_node)
graph.add_node("search_costs", search_costs_node)
graph.set_entry_point("supervisor")
graph.add_edge("supervisor", "effects")
graph.add_edge("supervisor", "population")
graph.add_edge("supervisor", "maps")
graph.add_edge("supervisor", "search_costs")
workflow = graph.compile()
