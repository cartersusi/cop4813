import numpy as np
from typing import Dict, List, Tuple

class KNearestNeighbors:
    def __init__(self, data: Dict[str, np.ndarray]):
        """
        Initialize KNN with a dictionary mapping IDs to result arrays.
        
        Args:
            data: Dictionary with structure {id: str, results: np.array()}
                 where results is a numpy array of 5 floats ranging from 1-5
        """
        self.data = data
        self.ids = list(data.keys())
        self.vectors = np.array([data[id_] for id_ in self.ids])
    
    def euclidean_distance(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Calculate Euclidean distance between two vectors."""
        return np.sqrt(np.sum((vec1 - vec2) ** 2))
    
    def manhattan_distance(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Calculate Manhattan distance between two vectors."""
        return np.sum(np.abs(vec1 - vec2))
    
    def cosine_distance(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Calculate cosine distance between two vectors."""
        dot_product = np.dot(vec1, vec2)
        norm_product = np.linalg.norm(vec1) * np.linalg.norm(vec2)
        if norm_product == 0:
            return 1.0  # Maximum distance for zero vectors
        return 1 - (dot_product / norm_product)
    
    def find_k_nearest(self, query_results: np.ndarray, k: int = 5, 
                      distance_metric: str = 'euclidean') -> List[Tuple[str, float]]:
        """
        Find the k nearest neighbors to the query results.
        
        Args:
            query_results: numpy array of 5 floats (1-5) to find neighbors for
            k: number of nearest neighbors to return
            distance_metric: 'euclidean', 'manhattan', or 'cosine'
        
        Returns:
            List of tuples (id, distance) sorted by distance (closest first)
        """
        if len(query_results) != 5:
            raise ValueError("Query results must be an array of exactly 5 values")
        
        # Choose distance function
        distance_functions = {
            'euclidean': self.euclidean_distance,
            'manhattan': self.manhattan_distance,
            'cosine': self.cosine_distance
        }
        
        if distance_metric not in distance_functions:
            raise ValueError(f"Distance metric must be one of: {list(distance_functions.keys())}")
        
        distance_func = distance_functions[distance_metric]
        
        # Calculate distances to all points
        distances = []
        for i, id_ in enumerate(self.ids):
            distance = distance_func(query_results, self.vectors[i])
            distances.append((id_, distance))
        
        # Sort by distance and return top k
        distances.sort(key=lambda x: x[1])
        return distances[:k]
    
    def find_k_nearest_vectorized(self, query_results: np.ndarray, k: int = 5) -> List[Tuple[str, float]]:
        """
        Vectorized version using only Euclidean distance for better performance.
        
        Args:
            query_results: numpy array of 5 floats (1-5) to find neighbors for
            k: number of nearest neighbors to return
        
        Returns:
            List of tuples (id, distance) sorted by distance (closest first)
        """
        if len(query_results) != 5:
            raise ValueError("Query results must be an array of exactly 5 values")
        
        # Vectorized Euclidean distance calculation
        distances = np.sqrt(np.sum((self.vectors - query_results) ** 2, axis=1))
        
        # Get indices of k smallest distances
        k_indices = np.argpartition(distances, k)[:k]
        k_indices = k_indices[np.argsort(distances[k_indices])]
        
        # Return sorted results
        return [(self.ids[i], distances[i]) for i in k_indices]


# Example usage and test
def example_usage():
    # Create sample data
    sample_data = {
        'user_1': np.array([4.2, 3.1, 2.8, 4.5, 3.9]),
        'user_2': np.array([2.1, 4.3, 3.2, 2.7, 4.1]),
        'user_3': np.array([4.8, 4.2, 4.1, 4.9, 4.3]),
        'user_4': np.array([1.2, 2.1, 1.8, 2.3, 1.9]),
        'user_5': np.array([3.5, 3.8, 3.2, 3.6, 3.4]),
        'user_6': np.array([4.9, 4.7, 4.8, 4.6, 4.5]),
        'user_7': np.array([2.3, 2.8, 2.1, 2.9, 2.6]),
        'user_8': np.array([3.1, 3.3, 3.7, 3.0, 3.2])
    }
    
    # Initialize KNN
    knn = KNearestNeighbors(sample_data)
    
    # Query for similar results
    query = np.array([4.0, 4.0, 4.0, 4.2, 4.1])
    
    print("Query results:", query)
    print("\nFinding 3 nearest neighbors using different metrics:")
    
    # Test different distance metrics
    for metric in ['euclidean', 'manhattan', 'cosine']:
        print(f"\n{metric.capitalize()} distance:")
        neighbors = knn.find_k_nearest(query, k=3, distance_metric=metric)
        for id_, distance in neighbors:
            print(f"  {id_}: {distance:.4f}")
    
    print("\nVectorized Euclidean (faster for large datasets):")
    neighbors = knn.find_k_nearest_vectorized(query, k=3)
    for id_, distance in neighbors:
        print(f"  {id_}: {distance:.4f}")

if __name__ == "__main__":
    example_usage()