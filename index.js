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
*****************************
Functions when creating User
*****************************
*/

exports.createDBUser = functions.auth.user().onCreate(event => {
	const userData = event.data;
	const email = userData.email;
	const university = getUniversity(email);
	const UID = userData.uid;

    const profiledata = {
        email: email,
        university: university,
        profileImg: "none",
        firstName: "",
        lastName: "",
        studying: university,
        about: "",
        graduating: "",
    }


	var updates = {};
	updates['users/' + UID + '/profile'] = profiledata;
	updates['universities/' + university + '/users/' + UID] = 'true'; 

	return admin.database().ref().update(updates);
})

function getUniversity(email) {
	const i = email.lastIndexOf('@') + 1;
	const j = email.lastIndexOf('.');
	const domain = email.substring(i,j);
	return domain;
}

/*
*****************************
Sending user Pass
*****************************
*/

exports.newSignIn = functions.database.ref('/signIn/{key}').onWrite(event => {
    const userData = event.data.val();
    userData.key = event.params.key;
    //const email = userData.email;
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
    console.log("generating pass");
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
    console.log(email);
    const mailOptions = {
        from: '"Backpack" <noreply@bacjpack.edu>',
        to: email,
    };
    
    mailOptions.subject = 'Your Password for Backpack';
    mailOptions.text = 'Here\'s your passcode: \n \n' + pass + '\n \n Thanks! \n'
    
    return mailTransport.sendMail(mailOptions)
    .then(function(mail) {
          removeKey(userData.key);
    })
    .catch((error) => console.log('error sending email:', error));
}

function removeKey(key) { 
    var updates = {};
    updates['/signIn/' + key] = null;
    admin.database().ref().update(updates);
}
function generatePass() {
    var num = (Math.random() * 1000000).toString();
    var str = num.split(".");
    return str[0];
}

/*
*****************************
Functions when creating post
*****************************
*/

//exports.createPost = functions.database.ref('/posts/{post}').onWrite(event => {
//	const postData = event.data.val();
//	const postKey = event.data.key;
//	const university = postData.university;
//	const uid = postData.uid;
//	const createdDate = postData.createdDate;
//
//	var updates = {};
//	// post added in posts, 
//	updates['universities/'+university+'/posts/'+postKey+'/createdDate'] = createdDate;
//	updates['userPosts/'+uid+'/'+ postKey+'/createdDate'] = createdDate;
//
//	return admin.database().ref().update(updates);
//})

/*
*********************************
Functions when user changes name
*********************************
*/

exports.updateSearch = functions.database.ref('/users/{uid}/profile').onUpdate(event => {
    const userProfile = event.data.val();
    const uid = event.params.uid;
    const firstName = userProfile.firstName;
    const lastName = userProfile.lastName;
    const university = userProfile.university;
    const fullName = firstName.toLowerCase() + " " + lastName.toLowerCase();
    
    var updates = {};
    updates['universityUsers/'+university+'/'+uid] = fullName;
    
    return admin.database().ref().update(updates);
})

/*
*****************************
Functions for notifications
*****************************
*/

exports.createNotifications = functions.database.ref('/comments/{comment}').onWrite(event => {
	const commentData = event.data.val();
	const postId = commentData.postId;
	const commenter = commentData.author;
	const date = commentData.date;
	const postOwner = commentData.postOwner;
	return admin.database().ref('postFollowers/' + postId).once('value')
	.then((snapshot) => {
		var followerData = snapshot.val();
		var updates = {};
		
		var notif = {
			notifUser: commenter,
			date: date,
			postOwner: postOwner
		};

		for (follower in followerData) {
			if (follower != commenter) {
				// send notif, user is not comment poster
				var key = admin.database().ref().child('userNotifications/' + follower).push().key;
				updates['userNotifications/'+follower+'/'+key] = notif;
			};
		};
		return admin.database().ref().update(updates);
	});
})

// NOT BEING USED
//function getPostFollowers(commentData) {
//	const postId = commentData.postId;
//	const commenter = commentData.author;
//	const date = commentData.date;
//	const postOwner = commentData.postOwner;
//	admin.database().ref('/postFollowers' + postId).once('value').then(function(snapshot){
//		var followerData = snapshot.val();
//		var updates = {};
//
//		// THIS SHOULD ALL HAPPEN IN GET FOLLOWERS FUNCTION
//		
//		var follower;
//		for (follower in followerData) {
//			const uid = follower.key;
//			//uid != commenter
//			if (true) {
//				// send notif, user is not comment poster
//				var key = firebase.database().ref().child('userNotifications/' + uid).push().key;
//				updates['userNotifications/'+uid+'/'+key] = notif;
//			};
//		};
//		return admin.database().ref().update(updates);
//	})
//}


