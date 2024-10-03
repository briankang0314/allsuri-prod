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
	
		// Select a channel from the list
		const channelListElement = document.getElementById('channelListContent');
		channelListElement.addEventListener('click', async (event) => {
			console.log('Channel list clicked'); // Added log
			const channelItem = event.target.closest('.channel-item');
			console.log('Channel item:', channelItem); // Added log
			if (channelItem) {
				const channelUrl = channelItem.dataset.channelUrl;
				console.log('Channel URL:', channelUrl); // Added log
				await OnChannelSelected(channelUrl);
			} else {
				console.log('Clicked outside channel items'); // Added log
			}
		});
	
		const logoLink = document.getElementById('logo-link');
		console.log('logoLink:', logoLink);
		if (logoLink) {
			logoLink.addEventListener('click', async (e) => {
				e.preventDefault();
				console.log('Logo link clicked, redirecting to home page.');
				await FillTheBody('home');
			});
		} else {
			console.warn('Logo link not found.');
		}
	}
}

async function LoadChannelList() {
    // Create a query to get the list of channels
    const channelListQuery = sb.groupChannel.createMyGroupChannelListQuery();
    channelListQuery.limit = 20;
    channelListQuery.includeEmpty = true;

    // Fetch the channels
    const channels = await channelListQuery.next();
    console.log('Channels fetched:', channels); // Added log

    const channelListElement = document.getElementById('channelListContent');
    channelListElement.innerHTML = '';

    // Populate the channel list in the UI
    channels.forEach(channel => {
        const channelItemElement = document.createElement('div');
        channelItemElement.classList.add('channel-item');
        channelItemElement.dataset.channelUrl = channel.url;
        channelItemElement.textContent = channel.name || 'Unnamed Channel';
        channelListElement.appendChild(channelItemElement);
        console.log('Channel item added:', channelItemElement); // Added log
    });
}

async function OnChannelSelected(channelUrl) {
    console.log('OnChannelSelected called with URL:', channelUrl); // Added log
    // Get the selected channel
    try {
        currentChannel = await sb.groupChannel.getChannel(channelUrl);
        console.log('Current channel:', currentChannel); // Added log
    } catch (error) {
        console.error('Error fetching channel:', error); // Added error handling
    }

    // Load messages for the selected channel
    await LoadMessages(currentChannel);
}

async function LoadMessages(channel) {
    console.log('LoadMessages called for channel:', channel.url); // Added log
    const messageListElement = document.getElementById('messageList');
    messageListElement.innerHTML = '';

    // Fetch messages from the channel
    const messageListParams = {
        prevResultSize: 50, // Number of messages to fetch before the timestamp
        nextResultSize: 0,  // Number of messages to fetch after the timestamp
        isInclusive: true,  // Include the message at the timestamp
        reverse: false,     // Fetch in ascending order (oldest to newest)
    };
    try {
        const messages = await channel.getMessagesByTimestamp(Date.now(), messageListParams);
        console.log('Messages fetched:', messages); // Added log

        // Display messages in the UI
        messages.forEach(message => {
            DisplayMessage(message);
        });
    } catch (error) {
        console.error('Error fetching messages:', error); // Added error handling
    }

    // Scroll to the bottom
    messageListElement.scrollTop = messageListElement.scrollHeight;
}

function DisplayMessage(message) {
    const messageListElement = document.getElementById('messageList');

    const messageItem = document.createElement('div');
    messageItem.classList.add('message-item');

    const senderElement = document.createElement('div');
    senderElement.classList.add('message-sender');
    senderElement.textContent = message.sender.nickname || 'Unknown';

    const contentElement = document.createElement('div');
    contentElement.classList.add('message-content');
    contentElement.textContent = message.message || '';

    messageItem.appendChild(senderElement);
    messageItem.appendChild(contentElement);

    messageListElement.appendChild(messageItem);

    // Scroll to the bottom
    messageListElement.scrollTop = messageListElement.scrollHeight;
}

async function SendMessage(channel, messageText) {
    // Send a user message
    const params = { message: messageText };
    const message = await channel.sendUserMessage(params);

    // Display the sent message immediately
    DisplayMessage(message);
}

function AddChannelHandler() {
    const channelHandler = new GroupChannelHandler();

    channelHandler.onMessageReceived = (channel, message) => {
        if (currentChannel && channel.url === currentChannel.url) {
            // Display the received message
            DisplayMessage(message);
        }
    };

    sb.groupChannel.addGroupChannelHandler('UNIQUE_HANDLER_ID', channelHandler);
}