module Comet.Types.Load exposing (Load(..), fromMaybe, fromResult, map)


type Load x a
    = Unloaded
    | Failed x
    | Loaded a


fromMaybe : Maybe a -> Load x a
fromMaybe maybe =
    case maybe of
        Just a ->
            Loaded a

        Nothing ->
            Unloaded


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
