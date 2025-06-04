import {
  SERVICE_KEY_ID,
  SERVICE_CLIENT_EMAIL,
  SERVICE_PRIVATE_KEY,
  SERVICE_SUBJECT,
  SHAREDRIVE_ID
  // CLIENT_ID,
  // CLIENT_SECRET,
  // REFRESH_TOKEN
} from '$env/static/private';
import { dev } from '$app/environment';
import jwt from 'jsonwebtoken';
import type { RequestHandler } from './$types';

// const getAccessToken = async (): Promise<string> => {
//   const payload = {
//     client_id: CLIENT_ID,
//     client_secret: CLIENT_SECRET,
//     refresh_token: REFRESH_TOKEN,
//     grant_type: 'refresh_token'
//   };
//   const response = await fetch('https://oauth2.googleapis.com/token', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/x-www-form-urlencoded'
//     },
//     body: new URLSearchParams(payload).toString()
//   });
//   if (!response.ok) {
//     const errorData = await response.json();
//     throw new Error(`Failed to get access token: ${errorData.error}`);
//   }
//   return response.json().then((data) => {
//     if (!data.access_token) {
//       throw new Error('No access token received');
//     }
//     return data.access_token;
//   });
// };

const issueJWT = async (): Promise<string> => {
  const token = jwt.sign(
    {
      iss: SERVICE_CLIENT_EMAIL,
      scope: 'https://www.googleapis.com/auth/drive',
      aud: 'https://oauth2.googleapis.com/token',
      sub: SERVICE_SUBJECT
    },
    SERVICE_PRIVATE_KEY,
    {
      algorithm: 'RS256',
      header: {
        alg: 'RS256',
        typ: 'JWT',
        kid: SERVICE_KEY_ID
      },
      expiresIn: '1h'
    }
  );

  const payload = {
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: token
  };
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(payload).toString()
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to issue JWT: ${errorData.error}`);
  }
  const data = await response.json();
  if (!data.access_token) {
    throw new Error('No access token received');
  }

  return data.access_token;
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  if (
    !body ||
    !body.fileName ||
    !body.fileType ||
    !body.fileSize ||
    !body.originalFileName ||
    !body.description
  ) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  try {
    const token = await issueJWT();
    // const token = await getAccessToken();
    const metadata = {
      name: body.fileName,
      mimeType: body.fileType,
      originalFileName: body.originalFileName,
      description: body.description,
      parents: [SHAREDRIVE_ID]
    };
    const headers = {
      Authorization: `Bearer ${token}`,
      'X-Upload-Content-Type': body.fileType,
      'X-Upload-Content-Length': body.fileSize.toString(),
      'Content-Type': 'application/json',
      origin: dev ? 'http://localhost:5173' : 'https://mookkornwedding.bossoq.live'
    };
    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
      {
        method: 'POST',
        headers,
        body: JSON.stringify(metadata)
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      return new Response(JSON.stringify({ error: errorData.error }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const location = response.headers.get('Location');
    if (!location) {
      return new Response(JSON.stringify({ error: 'No location header found' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    return new Response(JSON.stringify({ location }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error issuing JWT:', error);
    return new Response(JSON.stringify({ error: 'Failed to issue JWT' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
