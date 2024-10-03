import SendbirdChat from '@sendbird/chat';
import { GroupChannelModule, GroupChannelHandler } from '@sendbird/chat/groupChannel';
import { FillTheBody } from '../main.js';

const sb = SendbirdChat.init({
    appId: 'D183EE95-CAD0-42B9-89B0-09BB1654425F',
    modules: [new GroupChannelModule()],
});

let currentChannel = null;

export async function SetupChatPage() {
    // Assume user data is stored in localStorage
    const user = JSON.parse(localStorage.getItem('user'));

    if (user) {
        // Connect the user
        await sb.connect(user.user_id);
        await sb.updateCurrentUserInfo({
            nickname: user.nickname,
            profileUrl: user.thumbnail_image_url,
        });

        // Add channel handler to receive new messages
        AddChannelHandler();

        // Load the list of channels and set up event listeners
        await LoadChannelList();
        setupEventListeners();
    } else {
        // Redirect to login page if user is not authenticated
        await FillTheBody('login');
    }
}

function setupEventListeners() {
    // Send message on button click
    const sendButton = document.getElementById('sendButton');
    sendButton.addEventListener('click', async () => {
        const messageInput = document.getElementById('messageInput');
        const messageText = messageInput.value.trim();
        if (messageText && currentChannel) {
            await SendMessage(currentChannel, messageText);
            messageInput.value = '';
        }
    });

    // Send message on Enter key press
    const messageInput = document.getElementById('messageInput');
    messageInput.addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const messageText = messageInput.value.trim();
            if (messageText && currentChannel) {
                await SendMessage(currentChannel, messageText);
                messageInput.value = '';
            }
        }
    });

    // Select a channel from the list
    const channelListElement = document.getElementById('channelListContent');
    channelListElement.addEventListener('click', async (event) => {
        const channelItem = event.target.closest('.channel-item');
        if (channelItem) {
            const channelUrl = channelItem.dataset.channelUrl;
            await OnChannelSelected(channelUrl);
            // Close the channel list after selection
            closeChannelList();
        }
    });

    // Logo link to home page
    const logoLink = document.getElementById('logo-link');
    if (logoLink) {
        logoLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await FillTheBody('home');
        });
    } else {
        console.warn('Logo link not found.');
    }

    // Toggle Channel List Visibility
    const channelListBtn = document.getElementById('channelListBtn');
    const channelListOverlay = document.getElementById('channelListOverlay');
    const overlayBackground = document.getElementById('overlayBackground');


	async function toggleChannelList() {
        const channels = await LoadChannelList();
        if (channels.length > 0) {
            channelListOverlay.classList.add('active');
            overlayBackground.style.display = 'block';
            channelListOverlay.style.left = '0';
        } else {
            alert('No channels available.');
        }
    }

    if (channelListBtn) {
        channelListBtn.addEventListener('click', toggleChannelList);
    } else {
        console.warn('Channel list button not found.');
    }

    if (overlayBackground) {
        overlayBackground.addEventListener('click', closeChannelList);
    } else {
        console.warn('Overlay background not found.');
    }

	// Add resize event listener
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && channelListOverlay.classList.contains('active')) {
            channelListOverlay.style.left = '0';
        } else if (!channelListOverlay.classList.contains('active')) {
            closeChannelList();
        }
    });
}

function closeChannelList() {
	const channelListOverlay = document.getElementById('channelListOverlay');
	const overlayBackground = document.getElementById('overlayBackground');
	
	channelListOverlay.classList.remove('active');
	overlayBackground.style.display = 'none';
	if (window.innerWidth <= 768) {
		channelListOverlay.style.left = '-100%';
	} else {
		channelListOverlay.style.left = '-250px';
	}
}

async function LoadChannelList() {
	console.log('Loading channel list');
    // Create a query to get the list of channels
    const channelListQuery = sb.groupChannel.createMyGroupChannelListQuery();
    channelListQuery.limit = 20;
    channelListQuery.includeEmpty = true;

    try {
        const channels = await channelListQuery.next();
        console.log('Fetched channels:', channels);

        const channelListElement = document.getElementById('channelListContent');
        channelListElement.innerHTML = '';

        channels.forEach(channel => {
            console.log('Adding channel to list:', channel.name || 'Unnamed Channel');
            const channelItemElement = document.createElement('div');
            channelItemElement.classList.add('channel-item');
            channelItemElement.dataset.channelUrl = channel.url;
            channelItemElement.innerHTML = `<i class="bi bi-chat-dots me-2"></i> ${channel.name || 'Unnamed Channel'}`;
            channelListElement.appendChild(channelItemElement);
        });

        console.log('Channel list populated with', channels.length, 'channels');
        return channels; // Return the channels array
    } catch (error) {
        console.error('Error fetching channels:', error);
        return []; // Return an empty array if there's an error
    }
}

async function OnChannelSelected(channelUrl) {
    console.log('Channel selected:', channelUrl);
    try {
        currentChannel = await sb.groupChannel.getChannel(channelUrl);
        console.log('Fetched channel:', currentChannel);
    } catch (error) {
        console.error('Error fetching channel:', error);
    }

    await LoadMessages(currentChannel);
}

async function LoadMessages(channel) {
    console.log('Loading messages for channel:', channel.url);
    const messageListElement = document.getElementById('messageList');
    messageListElement.innerHTML = '';

    let allMessages = [];
    let hasMore = true;
    let timestamp = 0; // Start from the earliest timestamp

    while (hasMore) {
        const messageListParams = {
            prevResultSize: 0,
            nextResultSize: 100,
            isInclusive: false,
            reverse: false, // Messages ordered from oldest to newest
			includeMetaArray: true, // Include if you want meta arrays
            includeReactions: true, // Include if reactions are used
            includeSender: true,    // Ensure sender information is included
        };

        try {
            const messages = await channel.getMessagesByTimestamp(timestamp, messageListParams);

            if (messages.length > 0) {
                // Append messages to the end of allMessages
                allMessages = allMessages.concat(messages);
                // Update timestamp to the last message's createdAt
                timestamp = messages[messages.length - 1].createdAt + 1;
            } else {
                hasMore = false;
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            hasMore = false;
        }
    }

    // Now allMessages is ordered from oldest to newest
    allMessages.forEach(message => {
        DisplayMessage(message, false);
    });

    // Scroll to the bottom after loading messages
    messageListElement.scrollTop = messageListElement.scrollHeight;
}

function DisplayMessage(message, shouldScroll) {
    console.log('Displaying message:', message);
    const messageListElement = document.getElementById('messageList');

    // Create a unique ID for the message (optional but recommended)
    const messageId = `message-${message.messageId || Date.now()}`;

    // Check if the message already exists in the DOM
    if (document.getElementById(messageId)) {
        return; // Message already displayed
    }

    const messageItem = document.createElement('div');
    messageItem.classList.add('message-item');
    messageItem.id = messageId;

    // Determine if the message was sent by the current user
    const isSentByCurrentUser = message.sender && message.sender.userId === sb.currentUser.userId;

	console.log('Current User ID:', sb.currentUser.userId);
	console.log('Message Sender:', message.sender);

    // Assign 'sent' or 'received' class based on the sender
    if (!message.sender) {
		// Handle system or admin messages
		messageItem.classList.add('system-message');
	} else if (isSentByCurrentUser) {
		messageItem.classList.add('sent');
	} else {
		messageItem.classList.add('received');
	}

    const contentElement = document.createElement('div');
    contentElement.classList.add('message-content');
    contentElement.classList.add(isSentByCurrentUser ? 'sent' : 'received');
    contentElement.textContent = message.message || '';

    // Assign 'sent' or 'received' class to the message content
    contentElement.classList.add(isSentByCurrentUser ? 'sent' : 'received');

    // Create the timestamp element
    const timestampElement = document.createElement('div');
    timestampElement.classList.add('message-timestamp');

    // Format the timestamp to a readable format
    const messageDate = new Date(message.createdAt);
    const options = { hour: '2-digit', minute: '2-digit' };
    timestampElement.textContent = messageDate.toLocaleTimeString([], options);

    // Append content and timestamp to the message item
    messageItem.appendChild(contentElement);
    messageItem.appendChild(timestampElement);

    // Append the message item to the message list
    messageListElement.appendChild(messageItem);

    // Scroll to the bottom if necessary
    if (shouldScroll) {
        messageListElement.scrollTop = messageListElement.scrollHeight;
    }
}

async function SendMessage(channel, messageText) {
    console.log('Sending message:', messageText);
    const params = { message: messageText };
    const message = await channel.sendUserMessage(params);

    // Manually set the sender and createdAt if they are missing
    if (!message.sender) {
        message.sender = sb.currentUser;
    }
    if (!message.createdAt) {
        message.createdAt = Date.now();
    }

    message.message = messageText;

    console.log('Message sent:', message);
    DisplayMessage(message, true);
}

function AddChannelHandler() {
    console.log('Adding channel handler');
    const channelHandler = new GroupChannelHandler();

    channelHandler.onMessageReceived = (channel, message) => {
        console.log('Message received:', message);
        if (currentChannel && channel.url === currentChannel.url) {
            DisplayMessage(message, true);
        }
    };

    sb.groupChannel.addGroupChannelHandler('UNIQUE_HANDLER_ID', channelHandler);
}