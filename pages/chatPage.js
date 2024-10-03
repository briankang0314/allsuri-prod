import SendbirdChat from '@sendbird/chat';
import { GroupChannelModule, GroupChannelHandler } from '@sendbird/chat/groupChannel';
import { FillTheBody } from '../main.js';



const sb = SendbirdChat.init({
    appId: 'D183EE95-CAD0-42B9-89B0-09BB1654425F',
    modules: [new GroupChannelModule()],
});

let currentChannel = null;



export async function SetupChatPage() {
	console.log('SetupChatPage called');
	// Setup the chat page
    await initializeChat();
    
    async function initializeChat() {
        // Assuming the user data is stored in localStorage
        const user = JSON.parse(localStorage.getItem('user'));
		console.log('Retrieved user from localStorage:', user);
        if (user) {
			try {
				console.log('Connecting user:', user.user_id);
				const connectedUser = await sb.connect(user.user_id);
				await sb.updateCurrentUserInfo({ 
					nickname: user.nickname, 
					profileUrl: user.thumbnail_image_url,
				});
				console.log(`Connected as ${user.nickname}`);
			} catch (error) {
				console.error('Error connecting user:', error);
				return;
			}
            AddChannelHandler();
            // await RegisterPushToken(); // Implement if necessary
            await LoadChannelList();
            setupEventListeners();
        } else {
            // Redirect to login if user is not authenticated
            await FillTheBody('login');
        }
    }

	function setupEventListeners() {
        // Sending a message
        const sendButton = document.getElementById('sendButton');
        if (sendButton) {
            sendButton.addEventListener('click', async () => {
                const messageInput = document.getElementById('messageInput');
                const messageText = messageInput.value.trim();
                if (messageText && currentChannel) {
                    await SendMessage(currentChannel, messageText);
                    messageInput.value = '';
                }
            });
        }
    
        // Channel selection
        const channelListElement = document.getElementById('channelListContent');
        if (channelListElement) {
            channelListElement.addEventListener('click', async (event) => {
                const channelItem = event.target.closest('.channel-item');
                if (channelItem) {
                    const channelUrl = channelItem.dataset.channelUrl;
                    await OnChannelSelected(channelUrl);
					const channelList = document.querySelector('.channel-list');
					channelList.classList.remove('show');
                }
            });
        }

		const logoLink = document.getElementById('logo-link');
		if (logoLink) {
			logoLink.addEventListener('click', async (e) => {
				e.preventDefault();
				await FillTheBody('home');
			});
		}
    
        // Back button
        const backButton = document.getElementById('back-btn');
        if (backButton) {
            backButton.addEventListener('click', async () => await FillTheBody('home'));
        }

		const toggleChannelsBtn = document.getElementById('toggle-channels-btn');
		const channelList = document.querySelector('.channel-list');
		if (toggleChannelsBtn && channelList) {
			toggleChannelsBtn.addEventListener('click', () => {
				channelList.classList.toggle('show');
			});
		}
	}
}

async function LoadChannelList() {
	console.log('Starting LoadChannelList function');
	try {
		const channelListQuery = sb.groupChannel.createMyGroupChannelListQuery();
		channelListQuery.limit = 20; // Number of channels to load
		channelListQuery.includeEmpty = true;
		console.log('Channel list query created with limit:', channelListQuery.limit);

		const channels = await channelListQuery.next();
		console.log('Channels fetched:', channels.length);

		const channelListElement = document.getElementById('channelListContent');
		channelListElement.innerHTML = '';

		channels.forEach((channel, index) => {
			console.log(`Processing channel ${index + 1}:`, channel);
			const channelItemTemplate = document.getElementById('channelItemTemplate');
			console.log('Channel item template found:', channelItemTemplate);
			const channelItem = channelItemTemplate.content.firstElementChild.cloneNode(true);

			const channelItemElement = channelItem; // It's already the '.channel-item' element
			channelItemElement.dataset.channelUrl = channel.url;
			console.log('Channel URL set:', channel.url);

			const channelNameElement = channelItemElement.querySelector('.channel-name');
			const lastMessageElement = channelItemElement.querySelector('.last-message');
			const lastMessageTimeElement = channelItemElement.querySelector('.last-message-time');
			const unreadCountElement = channelItemElement.querySelector('.unread-count');

			channelNameElement.textContent = channel.name || 'No Name';
			console.log('Channel name set:', channelNameElement.textContent);

			lastMessageElement.textContent = channel.lastMessage ? channel.lastMessage.message : '';
			console.log('Last message set:', lastMessageElement.textContent);

			lastMessageTimeElement.textContent = channel.lastMessage ? new Date(channel.lastMessage.createdAt).toLocaleTimeString() : '';
			console.log('Last message time set:', lastMessageTimeElement.textContent);

			if (channel.unreadMessageCount > 0) {
				unreadCountElement.textContent = channel.unreadMessageCount;
				console.log('Unread count set:', unreadCountElement.textContent);
			} else {
				unreadCountElement.style.display = 'none';
				console.log('Unread count hidden');
			}

			channelListElement.appendChild(channelItemElement);
			console.log('Current channel list HTML:', channelListElement.innerHTML);
		});

		console.log('Channel list loading completed');
	} catch (error) {
		console.error('Error loading channel list:', error);
	}
}

async function OnChannelSelected(channelUrl) {
	currentChannel = await GetGroupChannel(channelUrl);
	await LoadMessages(currentChannel);
}

async function GetGroupChannel(channelUrl) {
	try {
		const channel = await sb.groupChannel.getChannel(channelUrl);
		console.log('Group channel fetched:', channel.url);

		// Update current channel info in UI
		const currentChannelInfo = document.getElementById('currentChannelInfo');
		if (currentChannelInfo) {
			currentChannelInfo.textContent = channel.name || 'No Name';
		}

		return channel;
	} catch (error) {
		console.error('Error fetching group channel:', error);
	}
}

async function LoadMessages(channel) {
	try {
		const messageListParams = {};
		const messages = await channel.getMessagesByTimestamp(Date.now(), messageListParams);

		const messageListElement = document.getElementById('messageList');
		messageListElement.innerHTML = '';

		messages.forEach(message => {
			displayMessage(message);
		});

		// Scroll to the bottom
		messageListElement.scrollTop = messageListElement.scrollHeight;
	} catch (error) {
		console.error('Error loading messages:', error);
	}
}

function displayMessage(message) {
	const messageListElement = document.getElementById('messageList');
	const messageBubbleTemplate = document.getElementById('messageBubbleTemplate');
	const messageBubble = messageBubbleTemplate.content.cloneNode(true);

	const messageBubbleElement = messageBubble.querySelector('.message-bubble');
	const messageContentElement = messageBubble.querySelector('.message-content');
	const messageSenderElement = messageBubble.querySelector('.message-sender');
	const messageTimeElement = messageBubble.querySelector('.message-time');

	messageContentElement.textContent = message.message;
	messageSenderElement.textContent = message.sender.nickname || 'Unknown';
	messageTimeElement.textContent = new Date(message.createdAt).toLocaleTimeString();

	if (message.sender.userId === sb.currentUser.userId) {
		messageBubbleElement.classList.add('sent');
	} else {
		messageBubbleElement.classList.add('received');
	}

	messageListElement.appendChild(messageBubble);
}

async function SendMessage(channel, messageText) {
	try {
		const params = { message: messageText };
		const message = await channel.sendUserMessage(params);
		console.log('Message sent:', message.message);

		// Display the sent message
		displayMessage(message);

		// Scroll to the bottom
		const messageListElement = document.getElementById('messageList');
		messageListElement.scrollTop = messageListElement.scrollHeight;

		return message;
	} catch (error) {
		console.error('Error sending message:', error);
	}
}

function AddChannelHandler() {
	const handlerId = 'UNIQUE_HANDLER_ID';
	const channelHandler = new GroupChannelHandler();

	channelHandler.onMessageReceived = (channel, message) => {
		console.log('New message received:', message.message);

		if (currentChannel && channel.url === currentChannel.url) {
			// Display the received message
			displayMessage(message);

			// Scroll to the bottom
			const messageListElement = document.getElementById('messageList');
			messageListElement.scrollTop = messageListElement.scrollHeight;
		}
	};

	sb.groupChannel.addGroupChannelHandler(handlerId, channelHandler);
}