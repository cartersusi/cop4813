# COP4813 Semester Project 
# Friend Finder

- [COP4813 Semester Project](#cop4813-semester-project)
- [Friend Finder](#friend-finder)
  - [Prod Build](#prod-build)
    - [Requirements](#requirements)
    - [Script (Recommended)](#script-recommended)
    - [Frontend Build](#frontend-build)
    - [Image (MacOS / ARM)](#image-macos--arm)
    - [Image (Linux / x86)](#image-linux--x86)
    - [Run](#run)
  - [Local Dev](#local-dev)
    - [Setup (mac)](#setup-mac)
    - [Frontend](#frontend)
      - [Setup](#setup)
      - [Build](#build)
    - [Backend](#backend)
      - [Setup](#setup-1)
      - [Run](#run-1)
  - [About](#about)

## Prod Build

### Requirements
- Docker
- Nodejs / Npm

### Script (Recommended)
```sh
./build_friendfinder.sh
```

### Frontend Build
```sh
cd frontend
npm install
npm run build
```

### Image (MacOS / ARM)
```sh
docker build --platform linux/arm64 -t friend-finder-service . # ARM 
```

### Image (Linux / x86)
```sh
docker build --platform linux/amd64 -t friend-finder-service . # x86 
```

### Run
```sh
docker run -p 8000:8000 -p 9090:9090 -p 5432:5432 friend-finder-service
```

## Local Dev

### Setup (mac)
```
chmod +x init_friendfinder.sh
./init_friendfinder.sh
```

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
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Run
```sh
python3 server.py
```

## About
**Friend Finder (Clifton Strengths Assessment)**
1. Description: Connects users with similar personalities based on quiz responses.
2. Challenge: Designing a simple matching algorithm with accessible scoring.
3. Solution: Backend python server calculates scores and matches based on thresholds.
4. Tiers:
- Presentation: Personality quiz, matches list
- Application: Matching logic in python
- Data: Users, responses, matches
5. Data Source: Quiz results stored in DB