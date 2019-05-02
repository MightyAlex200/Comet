# Comet
Comet is a reddit-like Holochain application.

Because it is built on Holochain, Comet has no censorship or moderation, and can
run on the devices of the users without the help of servers.

Comet also replaces the idea of "subreddits" with tags, and allows posts to be 
created and crossposted with more than 1 tag.

Perhaps the most interesting feature of Comet, though, is its voting system.
Firstly, votes can be fractional, they range from -1 to 1. Votes are also not
counted as "objective". The scores of posts and comments are always calculated
from the perspective of a particular agent (the user). This agent will have
upvoted and downvoted other posts from other people. The score is counted
depending on how the agent has voted on the other voters in the past. This helps
fight spam, vote manipulation, and helps maintain community in an otherwise
lawless space.

## Features
- [x] Posts
- [x] Tags
- [x] Comments
- [x] Voting
- [ ] Polls
    - Bridge to other poll holochain?
- [ ] Migration plan
    - Important to do before any official release!
- [ ] UI
    - [ ] Tags
        - [ ] View tags
        - [ ] Create tags
        - [ ] Rename tags
    - [ ] Posts
        - [ ] View posts with tag
        - [ ] View posts on user
        - [ ] Create posts on tag/user
        - [ ] Save posts
    - [ ] Comments
        - [ ] View comments on post
        - [ ] Save comments
        - [ ] Create comments
    - [ ] Voting
        - [ ] Vote on posts
        - [ ] Vote on comments
- [ ] Testing
    - [x] Anchors
      - [x] Anchors can be created
      - [x] Anchors exist
          - [x] Positive
          - [x] Negative
      - [x] Anchors are linked to the empty anchors
          - [x] Positive
          - [x] Negative
    - [x] Posts
        - [x] Creating a post
          - [x] Positive
          - [x] Negative
        - [x] Reading a post
          - [x] Positive
          - [x] Negative
        - [x] Updating a post
          - [x] Positive
          - [x] Negative
        - [x] Deleting a post
          - [x] Positive
          - [x] Negative
        - [x] Searching
          - [x] Positive
          - [x] Negative
        - [x] Getting tags from post
          - [x] Positive
          - [x] Negative
        - [x] Crossposting
          - [x] Positive
          - [x] Negative
        - [x] Can find posts from user
          - [x] Positive
          - [x] Negative
    - [ ] Comments
        - [ ] Creating a comment
          - [x] Positive
          - [ ] Negative
        - [ ] Reading a comment
          - [x] Positive
          - [ ] Negative
        - [ ] Updating a comment
          - [x] Positive
          - [ ] Negative
        - [ ] Deleting a comment
          - [x] Positive
          - [ ] Negative
        - [x] Get comments from post or another comment
          - [x] Positive
          - [x] Negative
    - [x] Votes
        - [x] Voting
          - [x] Positive
            - [x] Post
            - [x] Comment
          - [x] Negative
            - [x] Post
            - [x] Comment
        - [x] Revoting
          - [x] Positive
            - [x] Post
            - [x] Comment
          - [x] Negative
            - [x] Post
            - [x] Comment
        - [x] Get votes from post/comment
          - [x] Positive
            - [x] Post
            - [x] Comment
          - [x] Negative
            - [x] Post
            - [x] Comment
- [ ] Comments (in the code)
    - [x] Backend
        - [x] Posts
        - [x] Comments
        - [x] Votes
    - [ ] Frontend
    - [ ] Tests
      - [ ] Posts
      - [ ] Comments
      - [x] Votes
