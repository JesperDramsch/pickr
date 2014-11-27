import webapp2
from lib_db import ImageObject, Picks, Vote

from constants import db_parent

import json

from google.appengine.api import users

def authenticate(func):
    """
    Wrapper function for methods that require a logged in
    user
    """
    def authenticate_and_call(self, *args, **kwargs):
        user = users.get_current_user()
        if user is None:
            raise Exception
            return
        else:
            return func(self, user.user_id(),*args, **kwargs)
    return authenticate_and_call

def error_catch(func):
    """
    Wrapper for putting all page calls in a try and except
    """
    def call_and_catch(self, *args, **kwargs):

        try:
            func(self, *args, **kwargs)
        except Exception as e:
            print e
            self.error(500)
            
    return call_and_catch


class CommentHandler(webapp2.RequestHandler):

    @error_catch
    def get(self):

        index = int(self.request.get("index"))

        data = ImageObject.all().ancestor(db_parent).sort("-date")
        data = data.fetch(1000)[index]

        self.response.write(json.dumps(data.comments))

    @error_catch
    @authenticate
    def post(self, user_id):

        index = int(self.request.get("index"))
        comment = int(self.request.get("comment"))

        data = ImageObject.all().ancestor(db_parent).sort("date")
        data = data.fetch(1000)[index]
        comments = data.comments
        comments.append(comment)

        data.comments = comments
        data.put()

        self.response.write(comment)


class ImageHandler(webapp2.RequestHandler):

    @error_catch
    @authenticate
    def delete(self,user_id):

        image_key = self.request.get("image_key")

        image_obj = ImageObject.get_by_id(int(image_key),
                                          parent=db_parent)

        if ((image_obj.user_id == user_id) or
            (users.is_current_user_admin())):

            self.response.headers["Content-Type"] = "application/json"

            if not Picks.all().ancestor(image_obj).get():
                # Then there are no intepretations, so anyone can delete.
                image_obj.delete()
                self.response.write(json.dumps({"success":True}))
            else:
                # There are interpretations.
                if users.is_current_user_admin():
                    # Then you can delete all the same.
                    image_obj.delete()
                    self.response.write(json.dumps({"success":True}))
                else:
                    self.response.write(json.dumps({"interpretations":True}))
            
        else:
            self.error(500)

        
class VoteHandler(webapp2.RequestHandler):

    @error_catch
    @authenticate
    def get(self, user_id):

        self.response.headers["Content-Type"] = "application/json"
        

        owner_id = self.request.get("user")
        image_key = int(self.request.get("image_key"))

    
        img = ImageObject.get_by_id(image_key, parent=db_parent)
        picks = Picks.all().ancestor(img)

        picks = picks.filter("user_id =", owner_id).get()

        votes = picks.votes

    
        user_vote = Vote.all().ancestor(picks).filter("user_id =",
                                                      user_id)
        user_vote = user_vote.get()
        if not user_vote:
            user_choice = 0
        else:
            user_choice = user_vote.value

        data = {"votes": votes,
                "user_choice": user_choice}
    
        
        self.response.write(json.dumps(data))
        

    @error_catch
    @authenticate
    def post(self, user_id):

        self.response.headers["Content-Type"] = "application/json"

        owner_id = self.request.get("user")
        update_vote = int(self.request.get("vote"))
        img_key = int(self.request.get("image_key"))
        user = users.get_current_user()

        img = ImageObject.get_by_id(img_key,
                                    parent=db_parent)
        picks = Picks.all().ancestor(img)
        picks = picks.filter("user_id =", owner_id).get()

        # Prevent self voting
        if user_id == picks.user_id:
            update_vote = 0
            
        elif update_vote > 0:
            update_vote = 1
        else:
            update_vote = -1

        vote = Vote.all().ancestor(picks).filter("user_id =",
                                                 user_id).get()
        if vote is None:
            vote = Vote(user_id=user_id, value=update_vote,
                        parent=picks)
        else:
            # reset if they try to set to the same vote
            if vote.value == update_vote:
                vote.value = 0
            else:
                vote.value = update_vote

        vote.put()
        
        data = {"votes": picks.votes,
                "user_choice": vote.value}
        
        self.response.write(json.dumps(data))
 

class PickHandler(webapp2.RequestHandler):

    
    @error_catch
    @authenticate
    def get(self, user_id):

        image_key = self.request.get("image_key")
        img_obj = ImageObject.get_by_id(int(image_key),
                                        parent=db_parent
                                        )

        data = Picks.all().ancestor(img_obj)

        if self.request.get("all"):
            self.response.write(data)
            return

        if self.request.get("user_picks"):
            # Write out the picks belonging to the
            # requesting user.

            data = data.filter("user_id =", user_id).get()
            
            if data:
                picks = data.picks
            else:
                picks = json.dumps([])

            self.response.write(picks)
            return
        
        if self.request.get("user"):
            # Write out the picks for a specific user,
            # along with some flags to decide on 
            # display colour (set in pick-drawing.js).

            # Filter to those belonging to the requested
            # 'other' user.
            pick_user_id = self.request.get("user")
            other_data = data.filter("user_id =", pick_user_id).get()

            # We need to extract the data owner and current user's
            # picks an package them separately, to display them
            # separately in results.html.
            owner_id = img_obj.user_id
            owner_data = data.filter("user_id =", owner_id).get()
            user_data = data.filter("user_id =", user_id).get()

            # Deal with getting None
            if other_data:
                other_data = json.loads(other_data.picks)
            else:
                other_data = json.loads('[]')

            if owner_data:
                owner_data = json.loads(owner_data.picks)
            else:
                owner_data = json.loads('[]')

            # There should always be user data
            # But maybe not for admins...
            if user_data: 
                user_data = json.loads(user_data.picks)
            else:
                user_data = json.loads('[]')

            # Might as well set owner user 
            # AND current user flags. Display logic
            # is in pick-drawing.js
            owner, current = False, False
            if (user_id == pick_user_id):
                current = True
            if (img_obj.user_id == pick_user_id):
                owner = True

            output = {"data": other_data,
                      "owner_data": owner_data,
                      "user_data": user_data,
                      "owner": owner,
                      "current": current
                      }

            self.response.headers["Content-Type"] = "application/json"
            self.response.write(json.dumps(output))
            return

    @error_catch
    @authenticate
    def post(self, user_id):

        point = (int(self.request.get("x")),
                 int(self.request.get("y")))

        image_key = self.request.get("image_key")

        img_obj = ImageObject.get_by_id(int(image_key),
                                          parent=db_parent)
        
        picks = Picks.all().ancestor(img_obj)
        picks = picks.filter("user_id =", user_id).get()

        if not picks:
            # Then the user has not picked
            # this image before so start
            # some picks for this user.
            picks = Picks(user_id=user_id,
                          picks=json.dumps([point]).encode(),
                          parent=img_obj)
            picks.put()
            
            # In this case we also need to 
            # make a note of this user
            # interpreting this image.

            # Note this is redundant with having img_obj as the
            # parent. Might get out of sync...
            img_obj.interpreters.append(user_id)
            img_obj.put()

        else:
            # Then carry on adding picks.
            all_picks = json.loads(picks.picks)
            all_picks.append(point)
            picks.picks = json.dumps(all_picks).encode()
            picks.put()
            
        self.response.write("Ok")

    @error_catch
    @authenticate
    def delete(self, user_id):

        image_key = self.request.get("image_key")

        img_obj = ImageObject.get_by_id(int(image_key),
                                        parent=db_parent)

        data = Picks.all().ancestor(img_obj).filter("user_id =",
                                                    user_id)
        data = data.get()

        points = json.loads(data.picks)

        if self.request.get("clear"):
            data.delete()
            value = []

            # Also remove the user from the list of 
            # interpreters of this image.

            # Note this is redundant and might get out of sync.
            img_obj.interpreters.remove(user_id)
            img_obj.put()
            
        elif self.request.get("undo"):
            
            value = points.pop()
            data.picks = json.dumps(points).encode()
            data.put()
                 
        self.response.write(json.dumps(value))
