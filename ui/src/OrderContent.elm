module OrderContent exposing (..)

import VoteView

-- Putting an actual type here stops it from working but it's:
-- top : { voteView : { score : comparable } } -> { voteView : { score : comparable } } -> Order
top first second =
    compare second.voteView.score first.voteView.score
