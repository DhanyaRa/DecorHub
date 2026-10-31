# DecorHub – AI-Based Adaptive Interior Design System

**An AI-powered platform for personalized, intelligent, and budget-conscious interior design.**

## Overview

DecorHub is an AI-based adaptive interior design system developed to simplify and personalize the process of room planning and interior decoration.

The platform enables users to upload room photographs, specify lifestyle preferences, explore furniture recommendations, visualize room arrangements, and estimate furnishing costs.

By combining AI-assisted room analysis with user-specific requirements, DecorHub aims to provide practical, personalized, and budget-aware interior design solutions.

## Key Features

- **AI-Based Room Analysis:** Upload room photographs for AI-assisted analysis.
- **Lifestyle-Based Personalization:** Generate design suggestions based on individual preferences and requirements.
- **Furniture Recommendations:** Explore furniture options suitable for the selected room and design preferences.
- **2D Room Planner:** Visualize and organize furniture arrangements.
- **Budget Estimation:** Estimate furnishing expenses based on selected furniture.
- **Dynamic Bill of Materials:** View selected furniture items and their estimated costs.
- **Design Management:** Save and manage room design projects.

## Technology Stack

- **Frontend:** React, TypeScript, Vite
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui, Lucide React
- **AI Integration:** Google Gemini API
- **Backend & Database:** Supabase
- **3D / Visualization:** Three.js

## System Workflow

1. Upload a photograph of the room.
2. Complete the lifestyle and design preference questionnaire.
3. Process room information and user requirements.
4. Generate personalized interior design recommendations.
5. Explore furniture options and visualize room arrangements.
6. Review furniture selections and estimated budget.

## Installation and Setup

### Prerequisites
- Node.js
- npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/DhanyaRa/DecorHub.git
```

### 2. Navigate to the project

```bash
cd DecorHub
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env.local` file in the root directory.

Add the required configuration values, including:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Configure any additional Supabase credentials required by the application.

**Note:** Never upload API keys or private credentials to GitHub.

### 5. Run the application

```bash
npm run dev
```

## Future Enhancements

- Improved room dimension detection.
- More accurate furniture placement.
- Enhanced 3D room visualization.
- Expanded furniture catalogue.
- Improved AI-based personalization.

## Project Information

**Project:** DecorHub – AI-Based Adaptive Interior Design System

**Domain:** Artificial Intelligence, Interior Design and Web Development

---

*Making personalized interior design smarter, simpler, and more accessible.*