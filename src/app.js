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
  const fragmentFile = document.querySelector('#fragmentFile');
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

  // Show/hide text area or file input based on content type
  contentTypeSelect.addEventListener('change', () => {
    const selectedType = contentTypeSelect.value;
    
    // For image types, show file input and hide text area
    if (selectedType.startsWith('image/')) {
      fragmentText.style.display = 'none';
      fragmentFile.style.display = 'block';
    } else {
      fragmentText.style.display = 'block';
      fragmentFile.style.display = 'none';
    }
  });

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
    const selectedType = contentTypeSelect.value;
    let content;
    let contentLength = 0;
    
    try {
      createBtn.disabled = true;
      createStatus.textContent = `Creating ${selectedType} fragment...`;
      
      if (selectedType.startsWith('image/')) {
        // Handle file upload for images
        const file = fragmentFile.files[0];
        if (!file) {
          createStatus.textContent = 'Please select an image file';
          createBtn.disabled = false;
          return;
        }
        
        // Read file as ArrayBuffer
        content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        });
        
        contentLength = content.byteLength;
      } else {
        // Handle text input for text-based formats
        const text = fragmentText.value.trim();
        if (!text) {
          createStatus.textContent = 'Please enter some content';
          createBtn.disabled = false;
          return;
        }
        
        // Format content based on the selected type
        content = text;
        contentLength = text.length;
        
        // Special handling for JSON
        if (selectedType === 'application/json' && !text.startsWith('{') && !text.startsWith('[')) {
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
            contentLength = content.length;
          } catch (err) {
            createStatus.textContent = 'Invalid JSON format. Please check your input.';
            createBtn.disabled = false;
            return;
          }
        }
      }
      
      // Display request info
      requestInfo.textContent = `POST /v1/fragments\nContent-Type: ${selectedType}\nContent length: ${contentLength} bytes`;
      requestDetails.hidden = false;
      
      // Create the fragment
      let response;
      
      if (selectedType.startsWith('image/')) {
        // For images, we need to use fetch with ArrayBuffer
        response = await fetch(`${process.env.API_URL}/v1/fragments`, {
          method: 'POST',
          headers: {
            'Content-Type': selectedType,
            ...user.authorizationHeaders()
          },
          body: content
        });
      } else {
        // For text-based fragments, use regular fetch
        response = await fetch(`${process.env.API_URL}/v1/fragments`, {
          method: 'POST',
          headers: {
            'Content-Type': selectedType,
            ...user.authorizationHeaders()
          },
          body: content
        });
      }
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      // Get response data
      const data = await response.json();
      
      // Display response headers
      responseHeaders.textContent = 
        `Status: ${response.status}\n` +
        `Location: ${response.headers.get('Location') || 'N/A'}\n` +
        `Content-Type: ${response.headers.get('Content-Type') || 'N/A'}`;
      
      // Clear form and show success
      fragmentText.value = '';
      fragmentFile.value = '';
      createStatus.textContent = 'Fragment created successfully!';
      
      // Refresh the fragments list
      await displayFragments();
    } catch (err) {
      console.error('Error creating fragment:', err);
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
        
        // Create actions section
        const actions = document.createElement('div');
        actions.className = 'fragment-actions';
        
        // Preview button
        const previewBtn = document.createElement('button');
        previewBtn.textContent = 'View Content';
        previewBtn.onclick = async () => {
          try {
            previewBtn.disabled = true;
            
            // Check if preview is already shown
            let preview = fragmentDiv.querySelector('.fragment-content');
            if (preview) {
              preview.remove();
              previewBtn.textContent = 'View Content';
              previewBtn.disabled = false;
              return;
            }
            
            previewBtn.textContent = 'Loading...';
            
            // Create preview container
            preview = document.createElement('div');
            preview.className = 'fragment-content';
            
            // Handle different content types
            if (fragment.type.startsWith('image/')) {
              // For images, create an img element
              const img = document.createElement('img');
              img.alt = 'Fragment Image';
              // Get blob URL
              const response = await fetch(`${process.env.API_URL}/v1/fragments/${fragment.id}`, {
                headers: user.authorizationHeaders()
              });
              
              if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
              }
              
              const blob = await response.blob();
              img.src = URL.createObjectURL(blob);
              preview.appendChild(img);
            } else {
              // For text-based content
              const response = await fetch(`${process.env.API_URL}/v1/fragments/${fragment.id}`, {
                headers: user.authorizationHeaders()
              });
              
              if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
              }
              
              const content = await response.text();
              
              if (fragment.type.includes('json')) {
                try {
                  const formattedJson = JSON.stringify(JSON.parse(content), null, 2);
                  preview.innerHTML = `<pre>${formattedJson}</pre>`;
                } catch (e) {
                  preview.textContent = content;
                }
              } else if (fragment.type.includes('markdown')) {
                preview.innerHTML = `<pre>${content}</pre>`;
              } else {
                preview.textContent = content;
              }
            }
            
            fragmentDiv.appendChild(preview);
            previewBtn.textContent = 'Hide Content';
            previewBtn.disabled = false;
          } catch (err) {
            console.error('Error loading fragment:', err);
            previewBtn.textContent = 'Error loading preview';
            previewBtn.disabled = false;
          }
        };
        actions.appendChild(previewBtn);
        
        // Add conversion options based on fragment type
        if (fragment.type.startsWith('image/')) {
          // Image conversion options
          const formats = ['png', 'jpg', 'webp', 'gif'];
          
          // Only add conversion buttons for formats different from the current one
          const currentFormat = fragment.type.split('/')[1].toLowerCase();
          const formatButton = document.createElement('button');
          formatButton.textContent = 'Convert To:';
          formatButton.disabled = true;
          formatButton.style.marginLeft = '10px';
          actions.appendChild(formatButton);
          
          formats.forEach(format => {
            // Skip the current format
            if ((format === 'png' && fragment.type === 'image/png') ||
                (format === 'jpg' && fragment.type === 'image/jpeg') ||
                (format === 'webp' && fragment.type === 'image/webp') ||
                (format === 'gif' && fragment.type === 'image/gif')) {
              return;
            }
            
            const convBtn = document.createElement('button');
            convBtn.textContent = format.toUpperCase();
            convBtn.style.marginLeft = '5px';
            convBtn.onclick = async () => {
              try {
                convBtn.disabled = true;
                
                // Create or update image preview
                let imgPreview = fragmentDiv.querySelector('.image-preview');
                if (!imgPreview) {
                  imgPreview = document.createElement('div');
                  imgPreview.className = 'image-preview';
                  fragmentDiv.appendChild(imgPreview);
                }
                
                imgPreview.innerHTML = 'Converting image...';
                
                // Fetch the converted image
                const response = await fetch(`${process.env.API_URL}/v1/fragments/${fragment.id}.${format}`, {
                  headers: user.authorizationHeaders()
                });
                
                if (!response.ok) {
                  throw new Error(`Error: ${response.status} ${response.statusText}`);
                }
                
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                
                // Display the converted image
                imgPreview.innerHTML = `
                  <h4>Converted to ${format.toUpperCase()}</h4>
                  <img src="${url}" alt="Converted image">
                  <a href="${url}" download="fragment-${fragment.id.substring(0, 8)}.${format}">Download</a>
                `;
                
                convBtn.disabled = false;
              } catch (err) {
                console.error('Error converting image:', err);
                fragmentDiv.querySelector('.image-preview').innerHTML = `Error converting to ${format}`;
                convBtn.disabled = false;
              }
            };
            
            actions.appendChild(convBtn);
          });
        } else if (fragment.type === 'text/markdown') {
          // Add HTML preview button for markdown
          const htmlBtn = document.createElement('button');
          htmlBtn.textContent = 'HTML Preview';
          htmlBtn.style.marginLeft = '10px';
          htmlBtn.onclick = async () => {
            try {
              htmlBtn.disabled = true;
              
              // Check if HTML preview already exists
              let htmlPreview = fragmentDiv.querySelector('.html-preview');
              if (htmlPreview) {
                htmlPreview.remove();
                htmlBtn.textContent = 'HTML Preview';
                htmlBtn.disabled = false;
                return;
              }
              
              htmlBtn.textContent = 'Loading...';
              
              // Get HTML version
              const response = await fetch(`${process.env.API_URL}/v1/fragments/${fragment.id}.html`, {
                headers: user.authorizationHeaders()
              });
              
              if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
              }
              
              const html = await response.text();
              
              // Create and display HTML preview
              htmlPreview = document.createElement('div');
              htmlPreview.className = 'html-preview';
              htmlPreview.innerHTML = html;
              
              fragmentDiv.appendChild(htmlPreview);
              htmlBtn.textContent = 'Hide HTML';
              htmlBtn.disabled = false;
            } catch (err) {
              console.error('Error loading HTML preview:', err);
              htmlBtn.textContent = 'Error loading HTML';
              htmlBtn.disabled = false;
            }
          };
          
          actions.appendChild(htmlBtn);
        } else if (fragment.type === 'application/json') {
          // Add YAML conversion button for JSON
          const yamlBtn = document.createElement('button');
          yamlBtn.textContent = 'YAML View';
          yamlBtn.style.marginLeft = '10px';
          yamlBtn.onclick = async () => {
            try {
              yamlBtn.disabled = true;
              
              // Check if YAML preview already exists
              let yamlPreview = fragmentDiv.querySelector('.yaml-preview');
              if (yamlPreview) {
                yamlPreview.remove();
                yamlBtn.textContent = 'YAML View';
                yamlBtn.disabled = false;
                return;
              }
              
              yamlBtn.textContent = 'Loading...';
              
              // Get YAML version
              const response = await fetch(`${process.env.API_URL}/v1/fragments/${fragment.id}.yaml`, {
                headers: user.authorizationHeaders()
              });
              
              if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
              }
              
              const yaml = await response.text();
              
              // Create and display YAML preview
              yamlPreview = document.createElement('div');
              yamlPreview.className = 'yaml-preview';
              yamlPreview.innerHTML = `<pre>${yaml}</pre>`;
              
              fragmentDiv.appendChild(yamlPreview);
              yamlBtn.textContent = 'Hide YAML';
              yamlBtn.disabled = false;
            } catch (err) {
              console.error('Error loading YAML preview:', err);
              yamlBtn.textContent = 'Error loading YAML';
              yamlBtn.disabled = false;
            }
          };
          
          actions.appendChild(yamlBtn);
        }
        
        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.style.marginLeft = 'auto';
        deleteBtn.onclick = async () => {
          if (confirm('Are you sure you want to delete this fragment?')) {
            try {
              deleteBtn.disabled = true;
              
              // Delete the fragment
              const response = await fetch(`${process.env.API_URL}/v1/fragments/${fragment.id}`, {
                method: 'DELETE',
                headers: user.authorizationHeaders()
              });
              
              if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
              }
              
              // Remove from the UI
              fragmentDiv.remove();
            } catch (err) {
              console.error('Error deleting fragment:', err);
              alert(`Error deleting fragment: ${err.message}`);
              deleteBtn.disabled = false;
            }
          }
        };
        
        actions.appendChild(deleteBtn);
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