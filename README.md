# Comet
Comet is a reddit-like Holochain application.

## Features

- [ ] Testing
    - [ ] Posts
        - [x] Creating a post
        - [x] Reading a post
        - [x] Changing a post
        - [ ] Deleting a post
        - [x] `fromSub`
        - [x] `fromUser`
    - [ ] Comments
        - [x] Creating a comment
        - [x] Reading a comment
        - [ ] Changing a comment
        - [ ] Deleting a comment
        - [x] `fromHash`
    - [ ] Votes
        - [x] Creating a vote
        - [x] Can vote only once
        - [x] Reading a vote
        - [ ] Changing a vote
        - [ ] Deleting a vote
        - [x] `fromHash`
- [x] Posts
- [x] Subs ([Bought from Subway™](https://youtu.be/oQYwFND7rHE))
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
    - Subs
        - [ ] View subs
        - [ ] Rename subs
    - Posts
        - [x] View posts
        - [x] View posts on sub
        - [ ] View posts on user
        - [ ] Create posts
        - [ ] Edit posts
        - [ ] Cross post
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