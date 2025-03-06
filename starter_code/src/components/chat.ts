interface ChatMessage {
    user: string;
    text: string;
    time: string;
    isCurrentUser: boolean;
  }
  
  export function createChatPage(): HTMLElement 
  {
    // Create main container
    const container = document.createElement('div');
    container.className = 'page chat-page';
    
    // Page header
    const header = document.createElement('h1');
    header.textContent = 'Live Chat';
    container.appendChild(header);
    
    // Description text
    const description = document.createElement('p');
    description.textContent = 'Connect with other users in real-time.';
    container.appendChild(description);
    
    // Chat UI container
    const chatContainer = document.createElement('div');
    chatContainer.className = 'chat-container';
    
    // Chat header with user info
    const chatHeader = document.createElement('div');
    chatHeader.className = 'chat-header';
    
    const title = document.createElement('h2');
    title.textContent = 'Live Chat';
    
    const userInfo = document.createElement('div');
    userInfo.className = 'user-display';
    userInfo.textContent = 'Logged in as: User123';
    
    chatHeader.appendChild(title);
    chatHeader.appendChild(userInfo);
    
    // Message list area
    const messageList = document.createElement('div');
    messageList.className = 'message-list';
    
    // Add some sample messages for UI demonstration
    const sampleMessages: ChatMessage[] = [
      { user: 'System', text: 'Welcome to the chat!', time: '10:00', isCurrentUser: false },
      { user: 'Alice', text: 'Hey everyone!', time: '10:02', isCurrentUser: false },
      { user: 'User123', text: 'Hi Alice, nice to meet you!', time: '10:03', isCurrentUser: true },
      { user: 'Bob', text: 'Hello! How is everyone doing today?', time: '10:05', isCurrentUser: false }
    ];
    
    // Render the sample messages
    sampleMessages.forEach(msg => {
      const messageElement = document.createElement('div');
      
      if (msg.user === 'System') {
        messageElement.className = 'message system-message';
      } else if (msg.isCurrentUser) {
        messageElement.className = 'message my-message';
      } else {
        messageElement.className = 'message other-message';
      }
      
      messageElement.innerHTML = `
        <div class="message-header">
          <span class="message-user">${msg.user}</span>
          <span class="message-time">${msg.time}</span>
        </div>
        <div class="message-text">${msg.text}</div>
      `;
      
      messageList.appendChild(messageElement);
    });
    
    // Chat input area
    const inputArea = document.createElement('div');
    inputArea.className = 'chat-input-area';
    
    const messageInput = document.createElement('input');
    messageInput.type = 'text';
    messageInput.placeholder = 'Type a message...';
    messageInput.className = 'chat-input';
    
    const sendButton = document.createElement('button');
    sendButton.textContent = 'Send';
    sendButton.className = 'send-button';
    
    // Update this part of the code with link to script handling real chat functionality
    sendButton.addEventListener('click', () => {
      if (messageInput.value.trim()) {
        alert('Send button clicked! (This is just a UI demo, no messages are actually sent)');
        messageInput.value = '';
      }
    });
    
    // Update this part of the code with link to script handling real chat functionality
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && messageInput.value.trim()) {
        alert('Enter key pressed! (This is just a UI demo, no messages are actually sent)');
        messageInput.value = '';
      }
    });
    
    // Assemble the input area
    inputArea.appendChild(messageInput);
    inputArea.appendChild(sendButton);
    
    // Assemble all chat elements
    chatContainer.appendChild(chatHeader);
    chatContainer.appendChild(messageList);
    chatContainer.appendChild(inputArea);
    
    // Add chat container to the main container
    container.appendChild(chatContainer);
    
    return container;
  }