import numpy as np
import pandas as pd
from typing import Dict

def calculate_personality_scores(responses: np.array, questions_df: pd.DataFrame) -> Dict[str, float]:
    """
    Calculate Big Five personality scores from IPIP questionnaire responses.
    
    Parameters:
    -----------
    responses : np.array
        Array of response values (1-5) where:
        1 = Very Inaccurate
        2 = Moderately Inaccurate  
        3 = Neither Inaccurate nor Accurate
        4 = Moderately Accurate
        5 = Very Accurate
        
    questions_df : pd.DataFrame
        DataFrame with columns: 'id', 'question', 'factor', 'correlation'
        where correlation is '+' for positive keyed items, '-' for negative keyed items
        
    Returns:
    --------
    Dict[str, float]
        Dictionary with factor names as keys and average scores as values
    """
    
    # Validate input
    if len(responses) != len(questions_df):
        raise ValueError(f"Number of responses ({len(responses)}) must match number of questions ({len(questions_df)})")
    
    if not all(1 <= r <= 5 for r in responses):
        raise ValueError("All responses must be between 1 and 5")
    
    # Create a copy to avoid modifying original data
    scored_responses = responses.copy().astype(float)
    
    # Apply reverse scoring for negative keyed items
    negative_items = questions_df['correlation'] == '-'
    scored_responses[negative_items] = 6 - scored_responses[negative_items]
    
    # Calculate scores for each factor
    factor_scores = {}
    
    for factor in questions_df['factor'].unique():
        factor_mask = questions_df['factor'] == factor
        factor_responses = scored_responses[factor_mask]
        factor_scores[factor] = np.mean(factor_responses)
    
    return factor_scores

def get_factor_items(questions_df: pd.DataFrame, factor: str) -> pd.DataFrame:
    """
    Get all items for a specific factor.
    
    Parameters:
    -----------
    questions_df : pd.DataFrame
        DataFrame with question information
    factor : str
        Factor name (e.g., 'extraversion', 'agreeableness')
        
    Returns:
    --------
    pd.DataFrame
        Subset of questions_df for the specified factor
    """
    return questions_df[questions_df['factor'] == factor].copy()

def detailed_scoring_report(responses: np.array, questions_df: pd.DataFrame) -> Dict:
    """
    Generate a detailed scoring report with individual item scores and factor breakdowns.
    
    Parameters:
    -----------
    responses : np.array
        Array of response values (1-5)
    questions_df : pd.DataFrame
        DataFrame with question information
        
    Returns:
    --------
    Dict
        Detailed report with factor scores, item-level data, and summary statistics
    """
    
    # Calculate basic scores
    factor_scores = calculate_personality_scores(responses, questions_df)
    
    # Create detailed breakdown
    scored_responses = responses.copy().astype(float)
    negative_items = questions_df['correlation'] == '-'
    scored_responses[negative_items] = 6 - scored_responses[negative_items]
    
    # Build detailed report
    report = {
        'factor_scores': factor_scores,
        'total_items': len(responses),
        'factors': {}
    }
    
    for factor in questions_df['factor'].unique():
        factor_mask = questions_df['factor'] == factor
        factor_items = questions_df[factor_mask].copy()
        factor_responses = scored_responses[factor_mask]
        original_responses = responses[factor_mask]
        
        report['factors'][factor] = {
            'mean_score': factor_scores[factor],
            'num_items': len(factor_responses),
            'item_scores': factor_responses.tolist(),
            'original_responses': original_responses.tolist(),
            'items': factor_items[['id', 'question', 'correlation']].to_dict('records')
        }
    
    return report

# Example usage and testing
if __name__ == "__main__":
    questions_df = pd.read_csv('questions.csv')  # Load questions DataFrame
    start_time = pd.Timestamp.now()
    
    # Generate 50 random numbers as example responses
    example_responses = np.random.randint(1, 6, size=50)  # Random responses between 1 and 5
    
    # Calculate scores
    scores = calculate_personality_scores(example_responses, questions_df)
    print("Factor Scores:")
    for factor, score in scores.items():
        print(f"{factor}: {score:.2f}")
    
    print("\n" + "="*50)
    print("Detailed Report:")
    detailed_report = detailed_scoring_report(example_responses, questions_df)
    for factor, data in detailed_report['factors'].items():
        print(f"\n{factor.upper()}:")
        print(f"  Mean Score: {data['mean_score']:.2f}")
        print(f"  Number of Items: {data['num_items']}")

    print(f"Time taken: {pd.Timestamp.now() - start_time}")