// src/api.js

// fragments microservice API to use, defaults to localhost:8080 if not set in env
const apiUrl = process.env.API_URL || 'http://localhost:8080';

/**
 * Given an authenticated user, request all fragments for this user from the
 * fragments microservice, with expanded metadata if requested.
 */
export async function getUserFragments(user, expand = false) {
  console.log('Requesting user fragments data...', {
    apiUrl: `${apiUrl}/v1/fragments${expand ? '?expand=1' : ''}`,
    username: user.username,
    tokenLength: user.idToken.length,
    tokenStart: user.idToken.substring(0, 20) + '...'
  });

  try {
    const headers = user.authorizationHeaders();
    console.log('Request Headers:', headers);

    const res = await fetch(`${apiUrl}/v1/fragments${expand ? '?expand=1' : ''}`, {
      method: 'GET',
      headers: headers,
    });

    console.log('Response Status:', res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error Response Body:', errorText);
      throw new Error(`${res.status} ${res.statusText}: ${errorText}`);
    }

    const data = await res.json();
    console.log('Successfully got user fragments data', data);
    return data;
  } catch (err) {
    console.error('Unable to call GET /v1/fragments', { 
      errorName: err.name, 
      errorMessage: err.message,
      errorStack: err.stack 
    });
    throw err;
  }
}

/**
 * Create a new fragment with the given content and type
 */
export async function createFragment(user, content, contentType = 'text/plain') {
  console.log('Creating Fragment:', {
    apiUrl: `${apiUrl}/v1/fragments`,
    contentType,
    contentLength: content.length,
    username: user.username,
  });

  try {
    const headers = user.authorizationHeaders(contentType);
    console.log('Request Headers:', headers);

    const res = await fetch(`${apiUrl}/v1/fragments`, {
      method: 'POST',
      headers: headers,
      body: content,
    });

    console.log('Response Status:', res.status);
    console.log('Response Headers:', Object.fromEntries(res.headers.entries()));

    // Collect important response information
    const responseInfo = {
      status: res.status,
      headers: {
        location: res.headers.get('Location'),
        contentType: res.headers.get('Content-Type')
      }
    };

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error Response Body:', errorText);
      throw new Error(`${res.status} ${res.statusText}: ${errorText}`);
    }

    const data = await res.json();
    console.log('Successfully created fragment', data);
    
    // Return both the data and response information
    return {
      ...responseInfo,
      data
    };
  } catch (err) {
    console.error('Fragment Creation Error:', err);
    throw err;
  }
}

/**
 * Get a specific fragment's data by id, with optional extension for conversion
 */
export async function getFragment(user, idWithOptionalExtension) {
  console.log(`Getting fragment ${idWithOptionalExtension}...`);
  try {
    const res = await fetch(`${apiUrl}/v1/fragments/${idWithOptionalExtension}`, {
      headers: user.authorizationHeaders(),
    });
    
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }
    
    // Return the content based on the Content-Type
    const contentType = res.headers.get('Content-Type');
    console.log('Fragment content type:', contentType);
    
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    
    return await res.text();
  } catch (err) {
    console.error('Unable to get fragment data', { err });
    throw err;
  }
}

/**
 * Get fragment metadata
 */
export async function getFragmentInfo(user, id) {
  console.log(`Getting fragment info for ${id}...`);
  try {
    const res = await fetch(`${apiUrl}/v1/fragments/${id}/info`, {
      headers: user.authorizationHeaders(),
    });
    
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('Successfully got fragment info', data);
    return data;
  } catch (err) {
    console.error('Unable to get fragment info', { err });
    throw err;
  }
}