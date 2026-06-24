# 💕 Cute Couple Finder

Create a romantic surprise for your partner! Upload photos of both of you, and our AI will always match you two as the cutest couple. No matter who else is in the room, you two are the cutest couple! 💖

## How It Works
1. **Upload Your Photos**: Add photos of yourself (Person 1) and your partner (Person 2).
2. **AI Learns Your Faces**: The AI trains on your faces in seconds. Photos are processed locally and deleted immediately—only the mathematical representation of the faces remains.
3. **Send the Link**: Share the generated link with your partner. When they upload a photo to test themselves against a crowd of candidates, the AI will *always* pair them back to you.

## Project Structure
- `backend/`: Python-based backend that handles image upload, face feature extraction, and linear probing to always guarantee a match between the two specific partners.
- `frontend/`: Clean, beautiful frontend written in HTML/CSS/JS with smooth animations and floating hearts.
- `notebooks/`: Jupyter Notebook containing the training and prototyping logic for the linear probe model.

## Setup & Running Local Development

### Prerequisites
- Python 3.10+
- Git

### Backend Setup
1. Change directory to `backend`:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the development server:
   ```bash
   python app.py
   ```

### Frontend Setup
The frontend communicates with the backend APIs. To run it locally, you can serve the static files using Python's built-in HTTP server or open the HTML files directly.
