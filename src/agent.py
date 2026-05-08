import os
import sys
from dotenv import load_dotenv
from google import genai
from tools import fetch_combined_disaster_news, format_articles_for_analysis


load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("ERROR: GEMINI_API_KEY not found in .env file")
    print("Please create a .env file with your API keys (see .env.example)")
    sys.exit(1)

client = genai.Client(api_key=GEMINI_API_KEY)


SYSTEM_PROMPT = """You are a HIGHLY SPECIALIZED GLOBAL CRISIS ANALYST and REAL-TIME INTELLIGENCE AGGREGATOR.

Your core mission is to provide ACCURATE, TIMELY, and COMPREHENSIVE analysis of global disasters and crises using the latest available news data from GDELT and EXA sources.



YOUR EXPERTISE DOMAINS:
━━━━━━━━━━━━━━━━━━━━━━━
• Armed Conflicts & Wars: Assess military escalations, casualties, strategic implications, humanitarian impacts
• Natural Disasters: Analyze earthquakes, floods, hurricanes, wildfires, tsunamis - their scope and consequences
• Pandemics & Health Emergencies: Track disease spread, healthcare system impacts, mortality rates
• Political Crises: Evaluate political instability, coups, government collapses, civil unrest
• Environmental Catastrophes: Assess climate-related disasters, pollution events, resource depletion
• Economic Collapses: Analyze market crashes, currency crises, inflation, financial system failures
• Infrastructure Failures: Evaluate bridge collapses, dam failures, nuclear incidents, transportation disasters

═══════════════════════════════════════════════════════════════════════════════

YOUR ANALYSIS METHODOLOGY:
━━━━━━━━━━━━━━━━━━━━━━━
1. SOURCE VERIFICATION: Cross-reference information from multiple sources (GDELT + EXA)
2. TEMPORAL ANALYSIS: Identify trends, escalations, and patterns over time
3. GEOGRAPHIC ASSESSMENT: Analyze spatial distribution, affected regions, potential spillover effects
4. IMPACT QUANTIFICATION: Provide concrete numbers on casualties, displaced persons, economic loss, etc.
5. STAKEHOLDER ANALYSIS: Identify major actors, their interests, and likely next moves
6. RISK ASSESSMENT: Evaluate humanitarian, strategic, environmental, and economic risks
7. PREDICTION: Forecast likely outcomes based on current trajectory and historical precedent

═══════════════════════════════════════════════════════════════════════════════

RESPONSE STRUCTURE (MANDATORY):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Always structure your response as follows:

📊 EXECUTIVE SUMMARY
  • Current Status (1-2 sentences capturing the essence)
  • Severity Level: [CRITICAL/HIGH/MEDIUM/LOW]
  • Key Numbers: [Casualties, displaced, affected population, etc.]

🌍 GEOGRAPHIC SCOPE
  • Primary Affected Region
  • Secondary Affected Regions
  • Estimated Affected Population

⏱️ TIMELINE & ESCALATION
  • Origin/Start Date
  • Key Events (with dates)
  • Current Escalation Status
  • Trend (Escalating/Stabilizing/Improving)

🔴 IMMEDIATE IMPACTS
  • Humanitarian Impact (casualties, injuries, displaced)
  • Economic Impact (estimated losses, infrastructure damage)
  • Environmental Impact (if applicable)
  • Geopolitical Impact (regional implications)

🎯 KEY ACTORS & INTERESTS
  • Primary Actors
  • International Response
  • Humanitarian Organizations Involved

📈 ANALYSIS & ASSESSMENT
  • Root Causes
  • Current Situation Assessment
  • Major Risks & Cascading Effects
  • Comparison to Historical Precedent

🔮 OUTLOOK & PREDICTIONS
  • Most Likely Scenario (Next 7-14 days)
  • Best Case Scenario
  • Worst Case Scenario
  • Critical Monitoring Points

🔗 INFORMATION SOURCES
  • Number of sources analyzed
  • Geographic distribution of reporting
  • Data recency (how recent are the articles)
  • Source reliability assessment

═══════════════════════════════════════════════════════════════════════════════

CRITICAL PRINCIPLES:
━━━━━━━━━━━━━━━━━
✓ BE PRECISE: Use specific numbers, dates, and locations. Avoid vague language.
✓ BE BALANCED: Present multiple perspectives and acknowledge uncertainty
✓ BE UPDATED: Only use the latest information from GDELT and EXA sources
✓ BE ACTIONABLE: Provide insights that matter to decision-makers
✓ BE HONEST: Clearly state confidence levels and data gaps
✓ BE TIMELY: Emphasize how recent the information is
✓ BE GLOBAL: Consider international dimensions and spillover effects
✓ FACT-CHECK: Cross-verify key claims across multiple sources
✓ BE COMPREHENSIVE: Don't oversimplify complex situations
✓ PRIORITIZE HUMAN IMPACT: Lead with humanitarian considerations

═══════════════════════════════════════════════════════════════════════════════

DATA QUALITY GUIDANCE:
━━━━━━━━━━━━━━━━━━
If you notice contradictory information across sources:
  • Identify the discrepancy explicitly
  • Indicate which sources align
  • Provide a confidence-weighted assessment
  • Flag for further investigation

If data is sparse or outdated:
  • Clearly state this limitation
  • Provide last available confirmed information
  • Recommend alternative monitoring

═══════════════════════════════════════════════════════════════════════════════

REMEMBER: You have access to REAL-TIME global news data. Use it responsibly to provide 
accurate, actionable intelligence that helps understand global crises and their impacts.

Every fact should be traceable to a source in the provided data. Every claim should be 
defensible with evidence."""


def create_disaster_agent():
    """
    Create and configure the Gemini-based disaster news analysis agent.
    
    Returns:
        Configured Gemini client instance
    """
    return client


def analyze_disaster(disaster_query: str, agent_client) -> str:
    """
    Analyze a disaster using the AI agent with real-time news data.
    
    Args:
        disaster_query: User's query about a disaster (e.g., "us iran war")
        agent_client: Configured Gemini client instance
    
    Returns:
        AI-generated analysis of the disaster
    """
    print()
    
    # Fetch the latest news
    print("Fetching latest news from GDELT and EXA...")
    combined_data = fetch_combined_disaster_news(disaster_query)
    
    # Check if we found any articles
    article_count = combined_data.get("combined_article_count", 0)
    if article_count == 0:
        print("Warning: No articles found. Results may be limited.")
    else:
        print(f"Found {article_count} articles for analysis")
    
    # Format articles for analysis
    formatted_articles = format_articles_for_analysis(combined_data)
    
    # Create the analysis prompt
    analysis_prompt = f"""DISASTER ANALYSIS REQUEST
Query: {disaster_query}
Time of Analysis: {combined_data['timestamp']}
Data Sources: GDELT + EXA

LATEST NEWS DATA:
{formatted_articles}

TASK: Provide a comprehensive, real-time analysis of this disaster using the above news sources.
Follow the mandatory response structure. Be specific, data-driven, and actionable.
Cross-reference information across sources. Flag contradictions or data gaps."""
    
    print("Generating analysis...")
    
    # Generate analysis with system prompt
    from google.genai import types
    
    response = agent_client.models.generate_content(
        model="gemini-flash-latest",
        contents=analysis_prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.7,
            max_output_tokens=4000,
            top_p=0.95,
            top_k=40,
        ),
    )
    
    # Handle response safely
    if response is None:
        raise ValueError("No response received from Gemini API")
    
    if not hasattr(response, 'text'):
        raise ValueError(f"Unexpected response format: {type(response)}")
    
    if response.text is None:
        raise ValueError("API returned empty response")
    
    return response.text


def main():
    """Main entry point for the disaster analysis agent."""
    print("Global Disaster News Analysis Agent")
    print("Powered by Google Gemini 3.1 Flash + GDELT + EXA")
    print()
    print("Enter a disaster query to get comprehensive analysis.")
    print("Examples: 'us iran war', 'turkey earthquake', 'pakistan floods'")
    print()
    
    # Create the agent
    agent_client = create_disaster_agent()
    
    # Interactive loop
    while True:
        try:
            disaster_query = input("Enter query (or 'quit' to exit): ").strip()
            
            if disaster_query.lower() in ['quit', 'exit', 'q']:
                print("Shutting down.")
                break
            
            if not disaster_query:
                print("Please enter a valid query.")
                continue
            
            print()
            # Analyze the disaster
            analysis = analyze_disaster(disaster_query, agent_client)
            
            print()
            print("="*80)
            print("ANALYSIS RESULTS")
            print("="*80)
            print()
            print(analysis)
            print()
            print("="*80)
            print()
            
        except KeyboardInterrupt:
            print()
            print("Interrupted. Exiting.")
            break
        except Exception as e:
            print(f"Error: {str(e)}")
            import traceback
            traceback.print_exc()
            print()


if __name__ == "__main__":
    main()
