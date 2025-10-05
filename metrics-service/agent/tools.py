from pydantic import BaseModel 
from typing import Optional, List 
from langchain.tools import tool 
import requests 
from langchain.agents import initialize_agent
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os
from langchain.agents import initialize_agent, AgentType
from langchain.schema import SystemMessage
from langchain.prompts import MessagesPlaceholder
from models.mitigation_models import MitigationRequest 
from agent.toolkit import MitigationToolkit
import ast 

load_dotenv()

OPENAI_API_KEY = os.getenv("OPNEAI_API_KEY")
NASA_API_KEY = os.getenv("NASA_API_KEY")


@tool("neo_lookup")
def neo_lookup(neo_id: str) -> dict:
    """Searches for information about a NEO asteroid by its ID using NASA's API."""
    url = f"https://api.nasa.gov/neo/rest/v1/neo/{neo_id}?api_key={NASA_API_KEY}"
    r = requests.get(url)
    r.raise_for_status() 
    return r.json()


@tool("mitigation_toolkit", return_direct=True) 
def mitigation_tool_kit_tool(payload: dict | str) -> dict:
    """
    Evaluates asteroid impact mitigation strategies. Write at most 40 words, not more.

    Uses asteroid parameters (diameter, density, lead years, 
    relative velocity, structure, etc.) to calculate the effectiveness of 
    different techniques: kinetic impact, gravity tractor, nearby nuclear explosion, 
    and civil protection.

    Returns an analysis with:
    - Most recommended strategy.
    - Score for each technique.
    - Confidence in the recommendation.
    - Nominal and post-mitigation miss distance.
    - Suggested values such as Δv, number of impactors, direction, and timing.
    """

    # If input is a string, convert to dict
    if isinstance(payload, str):
        try:
            payload = ast.literal_eval(payload)  # safe alternative to eval()
        except Exception as e:
            raise ValueError(f"Error parsing payload string: {e}")

    request = MitigationRequest(**payload)
    toolkit = MitigationToolkit(request)
    response = toolkit.evaluate()
    return response.dict()


instructions = SystemMessage(
    content=(
        """
        You are an expert advisor in planetary defense. 
        You must always:
        1. Use the mitigation_toolkit tool with the asteroid parameters.
        2. Explain the best strategy based on its calculations (scores, Δv, miss distance).
        3. If needed, use the neo_lookup tool to complement orbital data.
        4. Respond in clear language, including the most relevant intermediate calculations.
        """
    )
)

llm = ChatOpenAI(model="gpt-4o-mini", openai_api_key=OPENAI_API_KEY, temperature=0.6)

agent = initialize_agent(
    tools=[mitigation_tool_kit_tool, neo_lookup],
    llm=llm,
    agent=AgentType.OPENAI_FUNCTIONS,
    verbose=True,
    handle_parsing_errors=True,
    agent_kwargs={
        "extra_prompt_messages": [instructions]
    }
)
