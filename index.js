// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database. 
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

// Email transport
const nodemailer = require('nodemailer');
// TODO: Set email and password in firebase config
const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;
const mailTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: gmailEmail,
        pass: gmailPassword,
    },
});


/*
**************************
*** Sending User login ***
**************************
*/

// triggers on new sign in key in databas
// this is creeated in your app when a user tries to login/signup
exports.newSignIn = functions.database.ref('/signIn/{key}').onWrite(event => {
    const userData = event.data.val();
    userData.key = event.params.key;
    return getUserByEmail(userData);
})

// finds uid for associated email
function getUserByEmail(userData) {
    const email = userData.email;
    console.log(email);
    return admin.auth().getUserByEmail(email)
        .then(function(userRecord) {
            userData.uid = userRecord.uid;
            console.log(userRecord.uid);
            return readyNewUser(userData);
        })
        .catch(function(err) {
            console.log("error fetching data: ", err); 
        });
}

// generates new pass then updates user account
function readyNewUser(userData) {
    const uid = userData.uid;
    var pass = generatePass();   // generate pass
    userData.pass = pass;

    return admin.auth().updateUser(uid, {
        password: pass,
    })
    .then(function(userRecord) {
        // successfully updated user record
        return sendUserPass(userData);
    })
    .catch(function(err) {
        // error
        console.log("error updating pass: ", err);
    })
}

// sends email with new generated password
function sendUserPass(userData) {
    const email = userData.email;
    const pass = userData.pass;
    
    const appName = "My New App" //TODO: Update this with the name of your app
    
    const mailOptions = {
        from: appName,
        to: email,
    };
    
    mailOptions.subject = 'Your Password for' + appName;
    mailOptions.text = 'Here\'s your passcode: \n \n' + pass + '\n \n Thanks! \n'
    
    return mailTransport.sendMail(mailOptions)
        .then(function(mail) {
            removeKey(userData.key);
        })
        .catch(function(error) {
            console.log('error sending email:', error)
        });
}
// removes the sign in key from database
function removeKey(key) { 
    var updates = {};
    updates['/signIn/' + key] = null;
    admin.database().ref().update(updates);
}
// Generates 6 digit passcode
function generatePass() {
    var num = (Math.random() * 1000000).toString();
    var str = num.split(".");
    return str[0];
}
