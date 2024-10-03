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
        console.log('initializeChat called');
        // Assuming the user data is stored in localStorage
        const user = JSON.parse(localStorage.getItem('user'));
        console.log('Retrieved user from localStorage:', user);
        if (user) {
            try {
                console.log('Connecting user:', user.user_id);
                const connectedUser = await sb.connect(user.user_id);
                console.log('User connected:', connectedUser);
                await sb.updateCurrentUserInfo({ 
                    nickname: user.nickname, 
                    profileUrl: user.thumbnail_image_url,
                });
                console.log(`User info updated: ${user.nickname}, ${user.thumbnail_image_url}`);
            } catch (error) {
                console.error('Error connecting user:', error);
                return;
            }
            AddChannelHandler();
            // await RegisterPushToken(); // Implement if necessary
            await LoadChannelList();
            setupEventListeners();
        } else {
            console.warn('User not found in localStorage, redirecting to login page.');
            // Redirect to login if user is not authenticated
            await FillTheBody('login');
        }
    }

    function setupEventListeners() {
        console.log('Setting up event listeners');
        // Sending a message
        const sendButton = document.getElementById('sendButton');
        console.log('sendButton element:', sendButton);
        if (sendButton) {
            sendButton.addEventListener('click', async () => {
                console.log('Send button clicked');
                const messageInput = document.getElementById('messageInput');
                const messageText = messageInput.value.trim();
                console.log('Message input value:', messageText);
                if (messageText && currentChannel) {
                    await SendMessage(currentChannel, messageText);
                    messageInput.value = '';
                }
            });
        } else {
            console.warn('Send button not found on the page.');
        }
    
        // Channel selection
        const channelListElement = document.getElementById('channelListContent');
        console.log('channelListElement:', channelListElement);
        if (channelListElement) {
            channelListElement.addEventListener('click', async (event) => {
                console.log('Channel list item clicked:', event.target);
                const channelItem = event.target.closest('.channel-item');
                if (channelItem) {
                    const channelUrl = channelItem.dataset.channelUrl;
                    console.log('Selected channel URL:', channelUrl);
                    await OnChannelSelected(channelUrl);
                    channelList.classList.remove('show'); // Hide the channel list
                }
            });
        } else {
            console.warn('Channel list element not found.');
        }

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

        // Back button
        const backButton = document.getElementById('back-btn');
        console.log('backButton:', backButton);
        if (backButton) {
            backButton.addEventListener('click', async () => {
                console.log('Back button clicked, redirecting to home page.');
                await FillTheBody('home');
            });
        } else {
            console.warn('Back button not found.');
        }

        const toggleChannelsBtn = document.getElementById('toggle-channels-btn');
        const channelList = document.querySelector('.channel-list');
        console.log('toggleChannelsBtn:', toggleChannelsBtn);
        console.log('channelList:', channelList);
        if (toggleChannelsBtn && channelList) {
            toggleChannelsBtn.addEventListener('click', () => {
                console.log('Toggle channels button clicked.');
                channelList.classList.toggle('show');
            });
        } else {
            console.warn('Toggle channels button or channel list not found.');
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
        console.log('channelListElement:', channelListElement);
        channelListElement.innerHTML = '';

        channels.forEach((channel, index) => {
            console.log(`Processing channel ${index + 1} of ${channels.length}:`, channel);
            const channelItemTemplate = document.getElementById('channelItemTemplate');
            console.log('Channel item template found:', channelItemTemplate);
            const channelItem = channelItemTemplate.content.firstElementChild.cloneNode(true);

            const channelItemElement = channelItem; // It's already the '.channel-item' element
            channelItemElement.dataset.channelUrl = channel.url;
            console.log('Channel URL set:', channel.url);

            const channelAvatarElement = channelItemElement.querySelector('.channel-avatar');
            const channelNameElement = channelItemElement.querySelector('.channel-name');
            const lastMessageElement = channelItemElement.querySelector('.last-message');
            const lastMessageTimeElement = channelItemElement.querySelector('.last-message-time');
            const unreadCountElement = channelItemElement.querySelector('.unread-count');

            console.log('DOM elements selected in channel item.');

            // Get other participants' info
            const otherMembers = channel.members.filter(member => member.userId !== sb.currentUser.userId);
            console.log('Other members in channel:', otherMembers);

            // Set channel avatar (using the first other member's profile image)
            if (otherMembers.length > 0 && otherMembers[0].profileUrl) {
                channelAvatarElement.src = otherMembers[0].profileUrl;
                console.log('Channel avatar set to:', otherMembers[0].profileUrl);
            } else {
                channelAvatarElement.src = '/path/to/default/avatar.png'; // Replace with your default avatar path
                console.log('Channel avatar set to default.');
            }

            // Set a user-friendly channel name (e.g., other participants' nicknames)
            if (channel.name && channel.name.trim() !== '') {
                channelNameElement.textContent = channel.name;
                console.log('Channel name set from channel.name:', channel.name);
            } else if (otherMembers.length > 0) {
                channelNameElement.textContent = otherMembers.map(member => member.nickname || 'Unknown').join(', ');
                console.log('Channel name set from other members:', channelNameElement.textContent);
            } else {
                channelNameElement.textContent = 'No Members';
                console.log('Channel has no members.');
            }

            lastMessageElement.textContent = channel.lastMessage ? channel.lastMessage.message : 'No messages yet';
            console.log('Last message set:', lastMessageElement.textContent);

            lastMessageTimeElement.textContent = channel.lastMessage ? new Date(channel.lastMessage.createdAt).toLocaleTimeString() : '';
            console.log('Last message time set:', lastMessageTimeElement.textContent);

            if (channel.unreadMessageCount > 0) {
                unreadCountElement.textContent = channel.unreadMessageCount;
                console.log('Unread count set:', unreadCountElement.textContent);
            } else {
                unreadCountElement.style.display = 'none';
                console.log('Unread count hidden for this channel.');
            }

            channelListElement.appendChild(channelItemElement);
            console.log('Channel item appended to channel list.');
        });

        console.log('Channel list loading completed');
    } catch (error) {
        console.error('Error loading channel list:', error);
    }
}

async function OnChannelSelected(channelUrl) {
    console.log('OnChannelSelected called with channelUrl:', channelUrl);
    currentChannel = await GetGroupChannel(channelUrl);
    if (currentChannel) {
        console.log('Current channel set to:', currentChannel);
        await LoadMessages(currentChannel);
    } else {
        console.warn('Failed to get group channel for URL:', channelUrl);
    }
}

async function GetGroupChannel(channelUrl) {
    console.log('GetGroupChannel called with channelUrl:', channelUrl);
    try {
        const channel = await sb.groupChannel.getChannel(channelUrl);
        console.log('Group channel fetched:', channel.url);

        // Update current channel info in UI
        const currentChannelInfo = document.getElementById('currentChannelInfo');
        console.log('currentChannelInfo element:', currentChannelInfo);
        if (currentChannelInfo) {
            // Display channel name and participant count
            const channelName = channel.name || 'No Name';
            const participantCount = channel.memberCount || 0;
            currentChannelInfo.innerHTML = `
                <h5 class="mb-0">${channelName}</h5>
                <small class="text-muted">${participantCount} participants</small>
            `;
            console.log('Current channel info updated with name and participant count.');
        }

        return channel;
    } catch (error) {
        console.error('Error fetching group channel:', error);
    }
}

async function LoadMessages(channel) {
    console.log('LoadMessages called for channel:', channel);
    try {
        const messageListParams = {
            prevResultSize: 50, // Number of messages to retrieve before the timestamp
            nextResultSize: 0,  // Number of messages to retrieve after the timestamp
            isInclusive: true,  // Include the message at the timestamp
            reverse: false,     // Messages will be in ascending order
        };
        console.log('Message list parameters:', messageListParams);

        const messages = await channel.getMessagesByTimestamp(Date.now(), messageListParams);
        console.log('Messages fetched:', messages.length);

        const messageListElement = document.getElementById('messageList');
        console.log('messageListElement:', messageListElement);
        messageListElement.innerHTML = '';

        messages.forEach(message => {
            console.log('Displaying message:', message);
            DisplayMessage(message);
        });

        // Scroll to the bottom
        messageListElement.scrollTop = messageListElement.scrollHeight;
        console.log('Message list scrolled to bottom.');
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function DisplayMessage(message) {
    console.log('DisplayMessage called with message:', message);
    const messageListElement = document.getElementById('messageList');
    const messageBubbleTemplate = document.getElementById('messageBubbleTemplate');
    console.log('messageBubbleTemplate:', messageBubbleTemplate);
    const messageBubble = messageBubbleTemplate.content.cloneNode(true);

    const messageBubbleElement = messageBubble.querySelector('.message-bubble');
    const messageContentElement = messageBubble.querySelector('.message-content');
    const messageSenderElement = messageBubble.querySelector('.message-sender');
    const messageTimeElement = messageBubble.querySelector('.message-time');
    const messageAvatarElement = messageBubble.querySelector('.message-avatar');

    messageContentElement.textContent = message.message;
    messageSenderElement.textContent = message.sender.nickname || 'Unknown';
    messageTimeElement.textContent = new Date(message.createdAt).toLocaleTimeString();
    console.log('Message content, sender, time set.');

    if (message.sender.profileUrl) {
        messageAvatarElement.src = message.sender.profileUrl;
        console.log('Message avatar set to sender profile URL.');
    } else {
        messageAvatarElement.src = '/path/to/default/avatar.png'; // Replace with your default avatar path
        console.log('Message avatar set to default.');
    }

    const messageReceiptElement = document.createElement('small');
    messageReceiptElement.classList.add('message-receipt', 'text-muted');

    if (message.sender.userId === sb.currentUser.userId) {
        const isDelivered = currentChannel.getReadReceipt(message);
        messageReceiptElement.textContent = isDelivered ? 'Read' : 'Sent';
        messageBubbleElement.appendChild(messageReceiptElement);
        messageBubbleElement.classList.add('sent');
        // Move avatar to the right for sent messages
        messageBubbleElement.classList.add('align-self-end');
        console.log('Message bubble styled as sent message.');
    } else {
        messageBubbleElement.classList.add('received');
        console.log('Message bubble styled as received message.');
    }

    messageListElement.appendChild(messageBubble);
    // Scroll to the bottom
    messageListElement.scrollTop = messageListElement.scrollHeight;
    console.log('Message bubble appended to message list and scrolled to bottom.');
}

async function SendMessage(channel, messageText) {
    console.log('SendMessage called with messageText:', messageText);
    try {
        const params = { message: messageText };
        const message = await channel.sendUserMessage(params);
        console.log('Message sent:', message.message);

        // Display the sent message
        DisplayMessage(message);

        // Scroll to the bottom
        const messageListElement = document.getElementById('messageList');
        messageListElement.scrollTop = messageListElement.scrollHeight;
        console.log('Message list scrolled to bottom after sending message.');

        return message;
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

function AddChannelHandler() {
    console.log('Adding group channel handler');
    const handlerId = 'UNIQUE_HANDLER_ID';
    const channelHandler = new GroupChannelHandler();

    channelHandler.onMessageReceived = (channel, message) => {
        console.log('New message received in channel:', channel.url, 'message:', message.message);

        if (currentChannel && channel.url === currentChannel.url) {
            console.log('Message is for current channel, displaying message.');
            // Display the received message
            DisplayMessage(message);

            // Scroll to the bottom
            const messageListElement = document.getElementById('messageList');
            messageListElement.scrollTop = messageListElement.scrollHeight;
        } else {
            console.log('Message is not for the current channel.');
        }
    };

    sb.groupChannel.addGroupChannelHandler(handlerId, channelHandler);
    console.log('Group channel handler added with handlerId:', handlerId);
}