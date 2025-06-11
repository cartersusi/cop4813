# COP4813 Semester Project 
# Friend Finder

- [COP4813 Semester Project](#cop4813-semester-project)
- [Friend Finder](#friend-finder)
    - [Frontend](#frontend)
      - [Setup](#setup)
      - [Build](#build)
    - [Backend](#backend)
      - [Setup](#setup-1)
      - [Run](#run)
    - [About](#about)


### Frontend
#### Setup
```sh
cd frontend
npm install
```

#### Build
```sh
# In `frontend` directory
npm run build
```

### Backend
#### Setup
```sh
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Run
```sh
python3 main.py
```

### About
**Friend Finder (Clifton Strengths Assessment)**
1. Description: Connects users with similar personalities based on quiz responses.
2. Challenge: Designing a simple matching algorithm with accessible scoring.
3. Solution: Backend python server calculates scores and matches based on thresholds.
4. Tiers:
- Presentation: Personality quiz, matches list
- Application: Matching logic in python
- Data: Users, responses, matches
5. Data Source: Quiz results stored in DB