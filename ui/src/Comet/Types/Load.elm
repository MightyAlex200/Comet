module Comet.Types.Load exposing (Load(..), fromResult)


type Load x a
    = Unloaded
    | Failed x
    | Loaded a


fromResult : Result x a -> Load x a
fromResult result =
    case result of
        Ok a ->
            Loaded a

        Err x ->
            Failed x


map : (a -> b) -> Load x a -> Load x b
map f load =
    case load of
        Unloaded ->
            Unloaded

        Failed x ->
            Failed x

        Loaded a ->
            Loaded (f a)
