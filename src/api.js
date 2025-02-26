// src/api.js

// fragments microservice API to use, defaults to localhost:8080 if not set in env
const apiUrl = process.env.API_URL || 'http://localhost:8080';

/**
 * Given an authenticated user, request all fragments for this user from the
 * fragments microservice.
 */
export async function getUserFragments(user) {
  console.log('Requesting user fragments data...');
  try {
    const res = await fetch(`${apiUrl}/v1/fragments`, {
      headers: user.authorizationHeaders(),
    });
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    console.log('Successfully got user fragments data', { data });
    return data;
  } catch (err) {
    console.error('Unable to call GET /v1/fragments', { err });
    throw err; // Re-throw error so caller can handle it
  }
}
// In fragments-ui/src/api.js
export async function createFragment(user, text) {
  console.log('Creating Fragment - Detailed Debug:', {
    apiUrl: `${apiUrl}/v1/fragments`,
    textLength: text.length,
    userDetails: {
      username: user.username,
      email: user.email,
    },
    authHeaderType: 'text/plain',
    tokenLength: user.idToken.length,
    tokenStart: user.idToken.substring(0, 50) + '...'
  });

  try {
    const headers = user.authorizationHeaders('text/plain');
    console.log('Request Headers:', headers);

    const res = await fetch(`${apiUrl}/v1/fragments`, {
      method: 'POST',
      headers: headers,
      body: text,
    });

    console.log('Full Response:', {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error Response Body:', errorText);
      throw new Error(`${res.status} ${res.statusText}: ${errorText}`);
    }

    const data = await res.json();
    console.log('Successfully created fragment', { data });
    return data;
  } catch (err) {
    console.error('Fragment Creation Error:', err);
    throw err;
  }
}


/**
 * Get a specific fragment's data by id
 */
export async function getFragment(user, id) { // Changed parameter name from fragmentId to id
  console.log(`Getting fragment ${id}...`);
  try {
    const res = await fetch(`${apiUrl}/v1/fragments/${id}`, {
      headers: user.authorizationHeaders(),
    });
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }
    const data = await res.text(); // Changed to .text() since we're dealing with text fragments
    console.log('Successfully got fragment data', { data });
    return data;
  } catch (err) {
    console.error('Unable to get fragment data', { err });
    throw err;
  }
}