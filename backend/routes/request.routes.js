const request = require('express').Router();
const db = require('../database/db_conection');
const bcrypt = require('bcrypt');
const { query } = require('express');
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) return res.json({ message: 'Token missing' });

    jwt.verify(token, 'secretkey', (err, user) => {
        if (err) return res.json({ message: 'Invalid token' });
        req.user = user; // Attach the decoded user object (including user_id and user_type) to the request
        next();
    });
};


// Make a new request for food by a charity
request.post('/request', authenticateToken, (req, res) => {
    const { food_id } = req.body;
    const { user_id, user_type } = req.user; // Extract the charity_id and user_type from the token

    // Ensure the user is a charity
    if (user_type !== 'charity') {
        return res.json({ message: 'You are not a charity' });
    }

    // Check if the food item exists and is available
    db.query(`SELECT * FROM foodlist WHERE food_id = ${food_id}`, (err, data) => {
        if (err) {
            res.json({ message: 'Error fetching food item' });
        } else if (!data.length || data[0].status !== 'available') {
            res.json({ message: 'Food is not available or does not exist' });
        } else {
            // Insert the request with the charity_id (from token)
            db.query(`INSERT INTO requests (food_id, charity_id, status) VALUES (${food_id}, ${user_id}, 'pending')`, (err, data) => {
                if (err) {
                    res.json({ message: 'Error making request' });
                } else {
                    // Update the status of the food item to 'claimed'
                    db.query(`UPDATE foodlist SET status = 'claimed' WHERE food_id = ${food_id}`, (err, data) => {
                        if (err) {
                            res.json({ message: 'Error updating food status' });
                        } else {
                            res.json({ message: 'Request made successfully' });
                        }
                    });
                }
            });
        }
    });
});


// Update the status of a request (e.g., 'fulfilled' or 'cancelled')
request.put('/updaterequest/:requestId', (req, res) => {
    
        const  requestId  = req.params.requestId;
        const { status } = req.body;

        
        db.query(`UPDATE requests SET status = '${status}' WHERE request_id = ${requestId}`,(err,data)=>{
            if(err) {
                res.json({ message: 'Request not found' });
            }
            else{
                res.json({ message: 'Request status updated successfully' });
            }
    
            res.json({ message: 'Request status updated successfully' });
        });

        
    
});

// Delete a request (e.g., charity cancels their request)
request.delete('/deleterequest/:requestId', (req, res) => {
    
        const  requestId  = req.params.requestId;
        db.query(`DELETE FROM requests WHERE request_id = ${requestId}`, (err,data)=>{
            if(err) {
                res.json({ message: 'Request not found' });
            }
            else{
                res.json({ message: 'Request deleted successfully' });
            }
    
        });

    
});

// Get all requests by a specific charity
request.get('/charity/:charityId',  (req, res) => {
        const  charityId  = req.params.charityId;
        db.query(`select * from requests where charity_id = ${charityId}`,(err,data)=>{
            if(err) {
                res.json({ message: 'Error' });
            }
            else{
                res.json(data);
            }
        });
    
});

// Get all requests for a specific food item (requested by different charities)
request.get('/foodrequest/:foodId',  (req, res) => {
        const  foodId  = req.params.foodId;
        db.query(`select * from requests where food_id = ${foodId}`,(err,data)=>{
            if(err) {
                res.json({ message: 'Error' });
            }
            else{
                res.json(data);
            }
        });
    
});

// Get all requests
request.get('/all',  (req, res) => {
    db.query(`select * from requests `,(err,data)=>{
        if(err) {
            res.json({ message: 'Error' });
        }
        else{
            res.json(data);
        }
    });

});

// Get name and email of the charity who made a specific request
request.get('/charityinfo/:requestId',  (req, res) => {
    const  requestId  = req.params.requestId;
    db.query(`select users.name, users.email from users inner join requests on users.user_id = requests.charity_id where requests.request_id = ${requestId}`,(err,data)=>{
        if(err) {
            res.json({ message: 'Error' });
        }
        else{
            res.json(data);
        }
    });

});


// Get total meals donated (total number of fulfilled requests)
request.get('/request/totalmeals', (req, res) => {
    db.query(`SELECT COUNT(*) as totalMeals FROM requests WHERE status = 'fulfilled'`, (err, data) => {
        if (err) {
            res.json({ message: 'Error fetching meals count' });
        } else {
            res.json({ totalMeals: data[0].totalMeals });
        }
    });
});

// Get total number of charities helped (unique charities with fulfilled requests)
request.get('/request/totalcharities', (req, res) => {
    db.query(`SELECT COUNT(DISTINCT charity_id) as totalCharities FROM requests WHERE status = 'fulfilled'`, (err, data) => {
        if (err) {
            res.json({ message: 'Error fetching charities count' });
        } else {
            res.json({ totalCharities: data[0].totalCharities });
        }
    });
});

// Get the charity id by charity name
request.get('/charityid/:charityName',  (req, res) => {
    const  charityName  = req.params.charityName;
    db.query(`select user_id from users where name = '${charityName}'`,(err,data)=>{
        if(err) {
            res.json({ message: 'Error' });
        }
        else if(data.length === 0){
            res.json({ message: 'Charity not found' });
        }
        else{
            res.json(data[0]);
        }
    });

});



module.exports = request;
