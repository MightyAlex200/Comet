# Comet
Comet is a reddit-like Holochain application.

## Features

- [ ] Polls
    - Bridge to other poll holochain?
- [ ] Migration plan
    - Important to do before any official release!
- [ ] ~~Testing~~
    - [ ] ~~Posts~~
        - [x] ~~Creating a post~~
        - [x] ~~Reading a post~~
        - [x] ~~Changing a post~~
        - [ ] ~~Deleting a post~~
<<<<<<< HEAD
        - [x] ~~`fromSub`~~
=======
        - [x] ~~`fromTag`~~
>>>>>>> master
        - [x] ~~`fromUser`~~
        - [x] ~~`crosspost`~~
    - [ ] ~~Comments~~
        - [x] ~~Creating a comment~~
        - [x] ~~Reading a comment~~
        - [ ] ~~Changing a comment~~
        - [ ] ~~Deleting a comment~~
        - [x] ~~`fromHash`~~
    - [x] ~~Votes~~
        - [x] ~~Voting~~
        - [x] ~~Revoting~~
        - [x] ~~Going back to original vote~~
        - [x] ~~`fromHash`~~~~
    - I'm giving up on testing until it's possible to do it without somehow dereferencing a null pointer (wait for beta)
- [x] Posts
- [x] Tags
- [x] Comments
- [x] Voting
- [ ] DPKI/Holo-Vault integration 
- [ ] Comments (in the code)
    - [ ] Backend
        - [ ] Posts
        - [ ] Comments
        - [ ] Votes
        - [ ] TimeMachine
    - [ ] Frontend
- [ ] UI
    - Tags
        - [ ] View tags
        - [ ] Create tags
        - [ ] Rename tags
    - Posts
        - [ ] View posts with tag
        - [ ] View posts on user
        - [ ] Create posts on tag/user
        - [ ] Save posts
        - [ ] NSFW censoring
    - Comments
        - [x] View comments
        - [x] View comments on post
        - [ ] Save comments
        - [ ] Create comments
        - [ ] Edit comments
    - Voting
        - [ ] Vote on posts
        - [ ] Vote on comments
        - [ ] Ammend comments
    - [ ] Comments (in the code)
- [ ] Rewritten in Rust
    - Wait until Holochain refactor and WASM/Rust ribosome

## Getting it set up
The DNA should work perfectly out of the box, but the frontend does require some set up. The only required application is [`npm`](https://www.npmjs.com/).

First `cd` into `ui/` and install all of the packages by running `npm install`. Once you have the packages you can build everything by running `npm run build`. Once all of the files are built you can `cd` up a level and run it with `hcdev w`.

You can clean the build artifacts by running `npm run clean` in `ui`.