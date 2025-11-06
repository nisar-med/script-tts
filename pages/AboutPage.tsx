import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-foreground">About Script-TTS</h1>
        <p className="text-lg text-muted-foreground">
          Transform movie and theatre scripts into engaging multi-character audio experiences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What is Script-TTS?</CardTitle>
          <CardDescription>Powered by Google Gemini AI</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground">
            Script-TTS is a cutting-edge text-to-speech application that brings scripts to life
            by converting dialogue into natural-sounding audio with different voices for each character.
          </p>
          <p className="text-foreground">
            Using advanced AI technology from Google's Gemini platform, our app intelligently
            extracts dialogue from scripts, detects character genders, and generates audio with
            appropriate voice assignments.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key Features</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="text-primary font-bold mr-2">•</span>
              <span className="text-foreground">
                <strong>Intelligent Dialogue Extraction:</strong> Automatically identifies and extracts
                dialogue from scripts with character names and delivery notes.
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-primary font-bold mr-2">•</span>
              <span className="text-foreground">
                <strong>Multi-Character Voices:</strong> Assigns different natural-sounding voices
                to each character based on detected gender.
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-primary font-bold mr-2">•</span>
              <span className="text-foreground">
                <strong>Voice Customization:</strong> Manually adjust voice assignments to match
                your creative vision.
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-primary font-bold mr-2">•</span>
              <span className="text-foreground">
                <strong>Delivery Control:</strong> Fine-tune how each line is spoken with emphasis
                levels and delivery notes.
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-primary font-bold mr-2">•</span>
              <span className="text-foreground">
                <strong>Secure Authentication:</strong> Google OAuth integration ensures your work
                remains private and secure.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Technology Stack</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">React</Badge>
            <Badge variant="secondary">TypeScript</Badge>
            <Badge variant="secondary">Vite</Badge>
            <Badge variant="secondary">TailwindCSS v4</Badge>
            <Badge variant="secondary">shadcn/ui</Badge>
            <Badge variant="secondary">Google Gemini AI</Badge>
            <Badge variant="secondary">Google Cloud Run</Badge>
            <Badge variant="secondary">Express.js</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 list-decimal list-inside">
            <li className="text-foreground">
              <strong>Sign In:</strong> Authenticate securely using your Google account.
            </li>
            <li className="text-foreground">
              <strong>Paste Script:</strong> Input your movie or theatre script into the text area.
            </li>
            <li className="text-foreground">
              <strong>Extract Dialogue:</strong> AI analyzes and extracts structured dialogue with
              character names and delivery notes.
            </li>
            <li className="text-foreground">
              <strong>Customize Voices:</strong> Review and adjust voice assignments for each character.
            </li>
            <li className="text-foreground">
              <strong>Generate Audio:</strong> Create high-quality multi-character audio from your script.
            </li>
            <li className="text-foreground">
              <strong>Download:</strong> Save your generated audio or dialogue text for later use.
            </li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security & Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground">
            Your security and privacy are our top priorities. Script-TTS implements several
            security measures:
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li className="text-foreground">
              API keys are never exposed to the client browser
            </li>
            <li className="text-foreground">
              All API requests are proxied through our secure backend server
            </li>
            <li className="text-foreground">
              Google OAuth ensures authenticated access only
            </li>
            <li className="text-foreground">
              Rate limiting protects against abuse
            </li>
            <li className="text-foreground">
              No scripts or audio are stored on our servers
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
