// src/app.js
import { signIn, getUser } from './auth';
import { getUserFragments, createFragment, getFragment } from './api';

async function init() {
  console.log('App initializing...');
  
  // Get our UI elements
  const userSection = document.querySelector('#user');
  const loginBtn = document.querySelector('#login');
  const createBtn = document.querySelector('#createBtn');
  const fragmentText = document.querySelector('#fragmentText');
  const contentTypeSelect = document.querySelector('#contentTypeSelect');
  const createStatus = document.querySelector('#createStatus');
  const fragmentsList = document.querySelector('#fragmentsList');
  const refreshBtn = document.querySelector('#refreshBtn');
  const requestDetails = document.querySelector('#requestDetails');
  const requestInfo = document.querySelector('#requestInfo');
  const responseHeaders = document.querySelector('#responseHeaders');
  const apiUrlDisplay = document.querySelector('#apiUrlDisplay');

  // Display the API URL we're using
  apiUrlDisplay.textContent = process.env.API_URL || 'http://localhost:8080';

  // Wire up event handlers to deal with login
  loginBtn.onclick = () => {
    console.log('Login button clicked');
    signIn();
  };

  // See if we're signed in
  const user = await getUser();
  console.log('User auth state:', !!user);

  if (!user) {
    return;
  }

  console.log('User is authenticated, showing UI');
  
  // Update the UI to welcome the user
  userSection.hidden = false;
  userSection.querySelector('.username').innerText = user.username;
  loginBtn.disabled = true;

  // Handle fragment creation
  createBtn.onclick = async () => {
    const text = fragmentText.value.trim();
    const contentType = contentTypeSelect.value;
    
    if (!text) {
      createStatus.textContent = 'Please enter some content';
      return;
    }

    try {
      createBtn.disabled = true;
      createStatus.textContent = `Creating ${contentType} fragment...`;
      
      // Format the content according to the selected type
      let content = text;
      
      // If JSON is selected and the input isn't already JSON formatted, try to format it
      if (contentType === 'application/json' && !text.startsWith('{')) {
        try {
          // Simple conversion for key:value format to JSON
          if (text.includes(':')) {
            const obj = {};
            text.split('\n').forEach(line => {
              const [key, value] = line.split(':').map(part => part.trim());
              if (key && value) {
                obj[key] = value;
              }
            });
            content = JSON.stringify(obj);
          } else {
            // Wrap plain text in a simple JSON structure
            content = JSON.stringify({ content: text });
          }
        } catch (err) {
          createStatus.textContent = 'Invalid JSON format. Please check your input.';
          createBtn.disabled = false;
          return;
        }
      }
      
      // Display request info
      requestInfo.textContent = `POST /v1/fragments\nContent-Type: ${contentType}\nContent length: ${content.length} bytes`;
      requestDetails.hidden = false;
      
      // Create the fragment
      const response = await createFragment(user, content, contentType);
      
      // Display response headers
      if (response.headers) {
        responseHeaders.textContent = 
          `Status: ${response.status}\n` +
          `Location: ${response.headers.location || 'N/A'}\n` +
          `Content-Type: ${response.headers.contentType || 'N/A'}`;
      }
      
      // Clear form and show success
      fragmentText.value = '';
      createStatus.textContent = 'Fragment created successfully!';
      
      // Refresh the fragments list
      await displayFragments();
    } catch (err) {
      createStatus.textContent = `Error: ${err.message}`;
    } finally {
      createBtn.disabled = false;
    }
  };

  // Handle refresh button
  refreshBtn.onclick = () => {
    displayFragments();
  };

  // Function to display fragments with expanded metadata
  async function displayFragments() {
    try {
      fragmentsList.innerHTML = '<p>Loading fragments...</p>';
      
      const data = await getUserFragments(user, true); // Get expanded fragment data
      const { fragments } = data;
      
      fragmentsList.innerHTML = ''; // Clear existing list

      if (!fragments || fragments.length === 0) {
        fragmentsList.innerHTML = '<p>No fragments yet</p>';
        return;
      }

      // For each fragment, create a display card
      fragments.forEach(fragment => {
        const fragmentDiv = document.createElement('div');
        fragmentDiv.className = 'fragment-item';
        
        // Create fragment header with ID and type
        const header = document.createElement('h4');
        header.textContent = `${fragment.id.substring(0, 8)}... (${fragment.type})`;
        fragmentDiv.appendChild(header);
        
        // Create metadata section
        const metadata = document.createElement('div');
        metadata.className = 'fragment-metadata';
        metadata.innerHTML = `
          <div>Created: ${new Date(fragment.created).toLocaleString()}</div>
          <div>Updated: ${new Date(fragment.updated).toLocaleString()}</div>
          <div>Size: ${fragment.size} bytes</div>
        `;
        fragmentDiv.appendChild(metadata);
        
        // Create content preview button
        const previewBtn = document.createElement('button');
        previewBtn.textContent = 'Preview Content';
        previewBtn.onclick = async () => {
          try {
            // Check if preview is already shown
            let preview = fragmentDiv.querySelector('.fragment-content');
            if (preview) {
              preview.remove();
              previewBtn.textContent = 'Preview Content';
              return;
            }
            
            previewBtn.textContent = 'Loading...';
            const content = await getFragment(user, fragment.id);
            
            // Create or update the preview
            preview = document.createElement('div');
            preview.className = 'fragment-content';
            
            // Handle different content types
            if (fragment.type.includes('json')) {
              try {
                const formattedJson = JSON.stringify(JSON.parse(content), null, 2);
                preview.textContent = formattedJson;
              } catch (e) {
                preview.textContent = content;
              }
            } else {
              preview.textContent = content;
            }
            
            fragmentDiv.appendChild(preview);
            previewBtn.textContent = 'Hide Content';
          } catch (err) {
            console.error('Error loading fragment:', err);
            previewBtn.textContent = 'Error loading preview';
          }
        };
        
        // Create actions section
        const actions = document.createElement('div');
        actions.className = 'fragment-actions';
        actions.appendChild(previewBtn);
        
        // Add HTML preview button for markdown fragments
        if (fragment.type === 'text/markdown') {
          const htmlPreviewBtn = document.createElement('button');
          htmlPreviewBtn.textContent = 'HTML Preview';
          htmlPreviewBtn.style.marginLeft = '10px';
          htmlPreviewBtn.onclick = async () => {
            try {
              // Check if HTML preview is already shown
              let htmlPreview = fragmentDiv.querySelector('.html-preview');
              if (htmlPreview) {
                htmlPreview.remove();
                htmlPreviewBtn.textContent = 'HTML Preview';
                return;
              }
              
              htmlPreviewBtn.textContent = 'Loading...';
              const content = await getFragment(user, `${fragment.id}.html`);
              
              // Create or update the HTML preview
              htmlPreview = document.createElement('div');
              htmlPreview.className = 'fragment-content html-preview';
              htmlPreview.innerHTML = content;
              
              fragmentDiv.appendChild(htmlPreview);
              htmlPreviewBtn.textContent = 'Hide HTML';
            } catch (err) {
              console.error('Error loading HTML preview:', err);
              htmlPreviewBtn.textContent = 'Error loading HTML';
            }
          };
          actions.appendChild(htmlPreviewBtn);
        }
        
        fragmentDiv.appendChild(actions);
        fragmentsList.appendChild(fragmentDiv);
      });
    } catch (err) {
      console.error('Error displaying fragments:', err);
      fragmentsList.innerHTML = `<p>Error: ${err.message}</p>`;
    }
  }

  // Display any existing fragments on load
  await displayFragments();
}

// Wait for the DOM to be ready, then start the app
addEventListener('DOMContentLoaded', init);