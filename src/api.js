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

/**
 * Create a new text fragment for the authenticated user
 */
export async function createFragment(user, text) { // Changed parameter name from fragment to text
  console.log('Creating new fragment...');
  try {
    const res = await fetch(`${apiUrl}/v1/fragments`, {
      method: 'POST',
      headers: user.authorizationHeaders('text/plain'), // Added content-type
      body: text, // Send raw text, not JSON.stringify()
    });
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    console.log('Successfully created new fragment', { data });
    return data;
  } catch (err) {
    console.error('Unable to create fragment', { err });
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