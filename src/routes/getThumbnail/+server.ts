import {
  SERVICE_KEY_ID,
  SERVICE_CLIENT_EMAIL,
  SERVICE_PRIVATE_KEY,
  SERVICE_SUBJECT
} from '$env/static/private';
import { dev } from '$app/environment';
import jwt from 'jsonwebtoken';
import type { RequestHandler } from './$types';

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

export const GET: RequestHandler = async ({ setHeaders, url }) => {
  const fileId = url.searchParams.get('fileId');
  if (!fileId) {
    return new Response(JSON.stringify({ error: 'Invalid request query' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  try {
    const token = await issueJWT();
    const headers = {
      Authorization: `Bearer ${token}`,
      origin: dev ? 'http://localhost:5173' : 'https://mookkornwedding.bossoq.live'
    };
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true&fields=thumbnailLink`,
      {
        method: 'GET',
        headers
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
    const responseData = await response.json();
    if (!responseData.thumbnailLink) {
      return new Response(JSON.stringify({ error: 'No thumbnail found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const thumbnailData = await fetch(responseData.thumbnailLink);
    if (!thumbnailData.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch thumbnail' }), {
        status: thumbnailData.status,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const thumbnailBlob = await thumbnailData.blob();
    setHeaders({
      'Content-Type': thumbnailBlob.type,
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });
    return new Response(thumbnailBlob, {
      status: 200,
      headers: {
        'Content-Type': thumbnailBlob.type
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
