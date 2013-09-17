// All Tomorrow's Articles -- data model
// Loaded on both the client and the server

///////////////////////////////////////////////////////////////////////////////
// Articles

/*
  Each article is represented by a document in the Articles collection:
    owner: user id
    x, y: Number (screen coordinates in the interval [0, 1])
    title, description: String
    public: Boolean
    invited: Array of user id's that are invited (only if !public)
    rsvps: Array of objects like {user: userId, rsvp: "yes"} (or "no"/"maybe")
*/
Articles = new Meteor.Collection("articles");

Articles.allow({
  insert: function (userId, article) {
    return false; // no cowboy inserts -- use createParty method
  },
  update: function (userId, article, fields, modifier) {
    if (userId !== article.owner)
      return false; // not the owner

    var allowed = ["title", "description", "x", "y"];
    if (_.difference(fields, allowed).length)
      return false; // tried to write to forbidden field

    // A good improvement would be to validate the type of the new
    // value of the field (and if a string, the length.) In the
    // future Meteor will have a schema system to makes that easier.
    return true;
  },
  remove: function (userId, article) {
    // You can only remove articles that you created and nobody is going to.
    return article.owner === userId;
  }
});

attending = function (article) {
  return (_.groupBy(article.rsvps, 'rsvp').yes || []).length;
};


///////////////////////////////////////////////////////////////////////////////
// Users

displayName = function (user) {
  if (user.profile && user.profile.name)
    return user.profile.name;
  return user.emails[0].address;
};

var contactEmail = function (user) {
  if (user.emails && user.emails.length)
    return user.emails[0].address;
  if (user.services && user.services.facebook && user.services.facebook.email)
    return user.services.facebook.email;
  return null;
};
