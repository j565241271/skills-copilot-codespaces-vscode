// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const axios = require('axios');
// Create express app
const app = express();
// Use body parser
app.use(bodyParser.json());
// Create comments object
const commentsByPostId = {};
// Create endpoints
app.get('/posts/:id/comments', (req, res) => {
    res.send(commentsByPostId[req.params.id] || []);
});
app.post('/posts/:id/comments', async (req, res) => {
    // Create comment id
    const commentId = randomBytes(4).toString('hex');
    // Get post id
    const { id } = req.params;
    // Get comment content
    const { content } = req.body;
    // Get comments for post
    const comments = commentsByPostId[id] || [];
    // Add new comment to comments
    comments.push({ id: commentId, content, status: 'pending' });
    // Set comments
    commentsByPostId[id] = comments;
    // Send event to event-bus
    await axios.post('http://event-bus-srv:4005/events', {
        type: 'CommentCreated',
        data: {
            id: commentId,
            content,
            postId: id,
            status: 'pending',
        },
    });
    // Send response
    res.status(201).send(comments);
});
app.post('/events', async (req, res) => {
    // Get event
    const { type, data } = req.body;
    // Check if event type is CommentModerated
    if (type === 'CommentModerated') {
        // Get comment id
        const { id, postId, status, content } = data;
        // Get comments for post
        const comments = commentsByPostId[postId];
        // Get comment
        const comment = comments.find((comment) => {
            return comment.id === id;
        });
        // Set comment status
        comment.status = status;
        // Send event to event-bus
        await axios.post('http://event-bus-srv:4005/events', {
            type: 'CommentUpdated',
            data: {
                id,
                postId,
                status,
                content,
            },
        });
    }
    // Send response
    res.send({});
});
// Listen on port