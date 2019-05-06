module NameTag exposing
    ( NameTag
    , Username
    , handleFunctionReturn
    , init
    , updateAgent
    , view
    )

import Comet.Port exposing (Id, getNewId)
import Comet.Posts
import Comet.Types.Address exposing (Address)
import Comet.Types.Load as Load exposing (Load(..))
import Comet.Types.ZomeApiError as ZomeApiError exposing (ZomeApiError)
import Comet.Types.ZomeApiResult as ZomeApiResult
import Html exposing (Html)
import Html.Attributes as Attributes
import Json.Decode as Decode


type alias Username =
    String


type alias NameTag =
    { name : Load ZomeApiError Username
    , address : Maybe Address
    , nameId : Maybe Id
    }


init : Id -> Maybe Address -> ( Id, NameTag, Cmd msg )
init oldId maybeAddress =
    case maybeAddress of
        Just agent ->
            let
                newId =
                    getNewId oldId
            in
            ( newId
            , { name = Unloaded
              , nameId = Just newId
              , address = Just agent
              }
            , Comet.Posts.getUsername newId agent
            )

        Nothing ->
            ( oldId
            , { name = Unloaded
              , nameId = Nothing
              , address = Nothing
              }
            , Cmd.none
            )


updateAgent : Id -> Address -> NameTag -> ( Id, NameTag, Cmd msg )
updateAgent oldId agent nameTag =
    let
        newId =
            getNewId oldId
    in
    ( newId
    , { nameTag
        | nameId = Just newId
        , address = Just agent
      }
    , Comet.Posts.getUsername newId agent
    )


handleFunctionReturn :
    Id
    -> Comet.Port.FunctionReturn
    -> NameTag
    -> ( Id, NameTag, Cmd msg )
handleFunctionReturn oldId ret nameTag =
    if Just ret.id == nameTag.nameId then
        let
            decoder =
                ZomeApiResult.decode Decode.string

            decodeResult =
                Decode.decodeValue decoder ret.return

            updateName name =
                ( oldId
                , { nameTag | name = name }
                , Cmd.none
                )
        in
        case decodeResult of
            Ok apiResult ->
                updateName (Load.fromResult apiResult)

            Err _ ->
                updateName (Failed (ZomeApiError.Internal "Invalid return"))

    else
        ( oldId, nameTag, Cmd.none )


view : NameTag -> Html msg
view nameTag =
    case ( nameTag.name, nameTag.address ) of
        ( Loaded name, Just address ) ->
            Html.p [ Attributes.title address ]
                [ Html.text ("Submitted by " ++ name)
                ]

        ( _, Just address ) ->
            Html.text ("Loading username (" ++ address ++ ")")

        ( _, _ ) ->
            Html.text "Loading username"
