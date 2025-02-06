# Cricket Bracket

[![Boys](https://vercelbadge.vercel.app/api/arsidada/cricket-bracket)](https://vercel.com/arsidada/cricket-bracket) 
[![Chawals](https://vercelbadge.vercel.app/api/arsidada/chawal-cricket-bracket)](https://vercel.com/arsidada/chawal-cricket-bracket)
[![Family](https://vercelbadge.vercel.app/api/arsidada/family-cricket-bracket)](https://vercel.com/arsidada/family-cricket-bracket)

This is a Next.js application that displays a leaderboard and fixtures for a cricket bracket challenge. It fetches data from a Google Sheet and displays the results, including group stage, Super 8, playoffs, and bonus points.

## Features

- **Leaderboard**: Displays the total points for each player, including points breakdown by group stage, Super 8, playoffs, and bonuses.
- **Fixtures**: Displays the picks for each player, sorted by newest first and grouped by group stage, Super 8 and playoffs.
- **Responsive Design**: Optimized for mobile users, with a collapsible points breakdown for each player.
- **Google Sheets Integration**: Fetches data from a Google Sheet to populate the leaderboard.
- **Authentication**: Uses NextAuth.js for user authentication.

## Technologies Used

- Next.js
- React
- Material-UI
- NextAuth.js
- Google Sheets API

## Getting Started

### Prerequisites

- Node.js (version 14.x or later)
- npm (version 6.x or later)
- Google Cloud project with Sheets API enabled
- Google Sheets with the necessary data

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/cricket-bracket.git
cd cricket-bracket
```

2. Install dependencies:

```bash
npm install
```

3. Create a .env.local file in the root directory and add your environment variables:

   ```bash
    NEXTAUTH_URL=http://localhost:3000
    GOOGLE_CREDENTIALS=your_google_credentials_base64_encoded
    GOOGLE_SHEET_ID=your_google_sheet_id
    ```

4. Run the development server:

    ```bash
    npm run dev
    ```

5. Open <http://localhost:3000> with your browser to see the result.

### Environment Variables

```bash
NEXTAUTH_URL: The URL of your Next.js application.
GOOGLE_CREDENTIALS: Base64 encoded string of your Google service account credentials JSON.
GOOGLE_SHEET_ID: The ID of your Google Sheet.
```

### Project Structure

```bash
.
├── app
│   └── leaderboard
│       └── page.tsx
│   └── fixtures
│       └── page.tsx
│   └── rules
│       └── page.tsx
│   └── bracket
│       └── page.tsx
│   └── layout.tsx
│   └── metadata.ts
│   └── page.tsx
├── pages
│   └── api
│       └── sheets.ts
│       └── get-bracket.ts
│       └── submit-bracket.ts
│       └── auth
│           └── [...nextauth].ts
├── public
├── styles
├── .env.local.example
├── README.md
├── next.config.js
├── package.json
└── tsconfig.json
```

## Components

Leaderboard: Displays the ranking of players with collapsible rows to show points breakdown.
Fixtures: Displays the fixtures with user predictions and results.

## API Endpoints

/api/sheets: Fetches data from the Google Sheets.

## Authentication

The application uses NextAuth.js for authentication. Users need to sign in to view the leaderboard and fixtures.

## Usage

View Leaderboard: Navigate to the leaderboard page to see the rankings and points breakdown.
View Fixtures: Navigate to the fixtures page to see the matches and user predictions.

## Deployment

To deploy this project, you can use Vercel or any other hosting service that supports Next.js applications.

### Deploying to Vercel

1.Install the Vercel CLI:

```bash
npm install -g vercel
```

2.Deploy the application:

```bash
vercel
```

3.ollow the prompts to complete the deployment.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.

```vbnet
This README includes an overview of the project, technologies used, installation instructions, environment variables, project structure, components, API endpoints, authentication, usage, deployment instructions, and contribution guidelines. Adjust the content as needed to fit your project's specifics.
```
