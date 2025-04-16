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
    // Create headers with authorization
    const headers = {
      'Authorization': `Bearer ${user.idToken}`
    };
    
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
    contentLength: content.length || (content instanceof Blob ? content.size : (content.byteLength || 0)),
    username: user.username,
    contentIsBlob: content instanceof Blob,
    contentIsBuffer: content instanceof ArrayBuffer,
    contentIsString: typeof content === 'string'
  });

  try {
    // Create headers with authorization and content type
    const headers = {
      'Authorization': `Bearer ${user.idToken}`,
      'Content-Type': contentType
    };
    
    console.log('Request Headers:', headers);

    const res = await fetch(`${apiUrl}/v1/fragments`, {
      method: 'POST',
      headers: headers,
      body: content, // This works with strings, ArrayBuffer, and Blob data
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
 * Get fragment data with proper content type handling
 */
export async function getFragment(user, idWithOptionalExtension) {
  console.log(`Getting fragment ${idWithOptionalExtension}...`);
  try {
    const headers = {
      'Authorization': `Bearer ${user.idToken}`
    };
    
    const res = await fetch(`${apiUrl}/v1/fragments/${idWithOptionalExtension}`, {
      headers: headers,
    });
    
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }
    
    const contentType = res.headers.get('Content-Type');
    
    // Handle image types
    if (contentType && contentType.startsWith('image/')) {
      return await res.arrayBuffer();
    }
    
    // Handle JSON
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
    const headers = {
      'Authorization': `Bearer ${user.idToken}`
    };
    
    const res = await fetch(`${apiUrl}/v1/fragments/${id}/info`, {
      headers: headers,
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

/**
 * Delete a fragment
 * @param {Object} user - The authenticated user 
 * @param {string} id - The fragment ID to delete
 * @returns {Promise<Object>} - Response data
 */
export async function deleteFragment(user, id) {
  console.log(`Deleting fragment ${id}...`);
  try {
    const res = await fetch(`${apiUrl}/v1/fragments/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${user.idToken}`
      }
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error Response Body:', errorText);
      throw new Error(`${res.status} ${res.statusText}: ${errorText}`);
    }
    
    return await res.json();
  } catch (err) {
    console.error('Unable to delete fragment', { err });
    throw err;
  }
}