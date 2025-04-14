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
 * @param {Object} user - The authenticated user
 * @param {string|ArrayBuffer|Blob} content - The fragment content
 * @param {string} contentType - The MIME type
 */
export async function createFragment(user, content, contentType = 'text/plain') {
  console.log('Creating Fragment:', {
    apiUrl: `${apiUrl}/v1/fragments`,
    contentType,
    contentLength: content.length || (content.byteLength || 0),
    username: user.username,
  });

  try {
    const headers = user.authorizationHeaders(contentType);
    console.log('Request Headers:', headers);

    const res = await fetch(`${apiUrl}/v1/fragments`, {
      method: 'POST',
      headers: headers,
      body: content, // This will work with strings and binary data
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

export async function getFragment(user, idWithOptionalExtension) {
  console.log(`Getting fragment ${idWithOptionalExtension}...`);
  try {
    const res = await fetch(`${apiUrl}/v1/fragments/${idWithOptionalExtension}`, {
      headers: user.authorizationHeaders(),
    });
    
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }
    
    const contentType = res.headers.get('Content-Type');
    
    // For images, return as ArrayBuffer
    if (contentType && contentType.startsWith('image/')) {
      return await res.arrayBuffer();
    }
    
    // For JSON
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    
    // Default to text for everything else
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

// Update in src/api.js
// Add this function to properly handle different content types including images

/**
 * Process fragment data based on its content type
 * @param {Response} response - The fetch response object
 * @returns {Promise<string|ArrayBuffer|Object>} - Processed data
 */
async function processResponseByContentType(response) {
  const contentType = response.headers.get('Content-Type');
  
  // Log the content type for debugging
  console.log('Processing response with Content-Type:', contentType);
  
  if (!contentType) {
    return await response.text();
  }
  
  // Handle image types
  if (contentType.startsWith('image/')) {
    // For images, we need to get the data as an ArrayBuffer and convert to a Blob
    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: contentType });
    // Return an object with the blob URL and mime type
    return {
      type: 'image',
      mimeType: contentType, 
      url: URL.createObjectURL(blob),
      blob
    };
  }
  
  // Handle JSON
  if (contentType.includes('application/json')) {
    return await response.json();
  }
  
  // Default to text for everything else
  return await response.text();
}


