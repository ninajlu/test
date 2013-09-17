// All Tomorrow's Articles -- server

Meteor.publish("directory", function () {
  return Meteor.users.find({}, {fields: {emails: 1, profile: 1}});
});

Meteor.publish("articles", function () {
  return Articles.find(
    {$or: [{"public": true}, {invited: this.userId}, {owner: this.userId}]});
});
Accounts.onCreateUser(function (options, user) {
  var accessToken = user.services.facebook.accessToken,
      result,
      profile;
      if (options.profile) { // maintain the default behavior
        user.profile = options.profile;
    }
	result = Meteor.http.get("https://graph.facebook.com/me", {
      params: {access_token: user.services.facebook.accessToken}});
	var friends = Meteor.http.get("https://graph.facebook.com/me/friends", {
      params: {access_token: user.services.facebook.accessToken}});
	if ( !result.error && result.data ) {
        // if successfully obtained facebook profile, save it off
        if(!friends.error && friends.data){
        	result.data.friends=friends.data;
        }
        user.profile = result.data;
    }

    return user;
});
var NonEmptyString = Match.Where(function (x) {
  check(x, String);
  return x.length !== 0;
});

var Coordinate = Match.Where(function (x) {
  check(x, Number);
  return x >= 0 && x <= 1;
});
Meteor.methods({
  // options should include: title, description, x, y, public
  createArticle: function (options) {
    check(options, {
      title: NonEmptyString,
      description: NonEmptyString,
      x: Coordinate,
      y: Coordinate,
      public: Match.Optional(Boolean)
    });

    if (options.title.length > 100)
      throw new Meteor.Error(413, "Title too long");
    if (options.description.length > 1000)
      throw new Meteor.Error(413, "Description too long");
    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");

    return Articles.insert({
      owner: this.userId,
      x: options.x,
      y: options.y,
      title: options.title,
      description: options.description,
      public: !! options.public,
      invited: [],
      rsvps: []
    });
  },

  invite: function (articleId, userId) {
    check(articleId, String);
    check(userId, String);
    var article = Articles.findOne(articleId);
    if (! article || article.owner !== this.userId)
      throw new Meteor.Error(404, "No such article");
    if (article.public)
      throw new Meteor.Error(400,
                             "That article is public. No need to invite people.");
    if (userId !== article.owner && ! _.contains(article.invited, userId)) {
      Articles.update(articleId, { $addToSet: { invited: userId } });

      var from = contactEmail(Meteor.users.findOne(this.userId));
      var to = contactEmail(Meteor.users.findOne(userId));
      if (Meteor.isServer && to) {
        // This code only runs on the server. If you didn't want clients
        // to be able to see it, you could move it to a separate file.
        Email.send({
          from: "noreply@example.com",
          to: to,
          replyTo: from || undefined,
          subject: "PARTY: " + article.title,
          text:
"Hey, I just invited you to '" + article.title + "' on All Tomorrow's Articles." +
"\n\nCome check it out: " + Meteor.absoluteUrl() + "\n"
        });
      }
    }
  },

  rsvp: function (articleId, rsvp) {
    check(articleId, String);
    check(rsvp, String);
    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in to RSVP");
    if (! _.contains(['yes', 'no', 'maybe'], rsvp))
      throw new Meteor.Error(400, "Invalid RSVP");
    var article = Articles.findOne(articleId);
    if (! article)
      throw new Meteor.Error(404, "No such article");
    if (! article.public && article.owner !== this.userId &&
        !_.contains(article.invited, this.userId))
      // private, but let's not tell this to the user
      throw new Meteor.Error(403, "No such article");

    var rsvpIndex = _.indexOf(_.pluck(article.rsvps, 'user'), this.userId);
    if (rsvpIndex !== -1) {
      // update existing rsvp entry

      if (Meteor.isServer) {
        // update the appropriate rsvp entry with $
        Articles.update(
          {_id: articleId, "rsvps.user": this.userId},
          {$set: {"rsvps.$.rsvp": rsvp}});
      } else {
        // minimongo doesn't yet support $ in modifier. as a temporary
        // workaround, make a modifier that uses an index. this is
        // safe on the client since there's only one thread.
        var modifier = {$set: {}};
        modifier.$set["rsvps." + rsvpIndex + ".rsvp"] = rsvp;
        Articles.update(articleId, modifier);
      }

      // Possible improvement: send email to the other people that are
      // coming to the article.
    } else {
      // add new rsvp entry
      Articles.update(articleId,
                     {$push: {rsvps: {user: this.userId, rsvp: rsvp}}});
    }
  },
  updatefriends: function(userId){
    check(userId, String);
    
 var user=Meteor.user();
  var accessToken = user.services.facebook.accessToken,
      result,
      profile;
  result = Meteor.http.get("https://graph.facebook.com/me", {
      params: {access_token: user.services.facebook.accessToken}});
  var friends = Meteor.http.get("https://graph.facebook.com/me/friends", {
      params: {access_token: user.services.facebook.accessToken}});
  console.log(result.data);
    if ( !result.error && result.data ) {
        // if successfully obtained facebook profile, save it off
        if(!friends.error && friends.data){  
          result.data.friends=friends.data;
        }
        Meteor.users.update({_id: userId}, {
              $set: {
                'profile': result.data
              }
            });  
    }
  }

});


