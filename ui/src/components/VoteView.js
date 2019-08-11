import React from 'react';
import PropTypes from 'prop-types';
import { withStyles, Box, Typography, CircularProgress } from '@material-ui/core';
import { connect } from 'react-redux';
import { fetchVotes, fetchMyVote, castVote } from '../actions';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import ErrorIcon from '@material-ui/icons/Error';
import util from '../util';

const styles = theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'center',
  },
  upArrow: {
    color: 'orange',
    marginTop: '-100%',
  },
  downArrow: {
    color: 'cornflowerblue',
    marginTop: '-100%',
  },
});

class VoteView extends React.Component {
  static maxWeight = 15;

  static capWeight(weight) {
    return Math.min(VoteView.maxWeight, Math.max(weight, -VoteView.maxWeight));
  }

  state = {
    justVoted: false,
  }

  constructor(props) {
    super(props);
    this.foregroundUpArrow = React.createRef();
    this.backgroundUpArrow = React.createRef();
    this.foregroundDownArrow = React.createRef();
    this.backgroundDownArrow = React.createRef();
  }

  componentDidMount() {
    this.cache();
  }

  componentDidUpdate(prevProps) {
    this.cache();
    if ((!prevProps.voteJustCast || (prevProps.voteJustCast.address !== this.props.voteJustCast.address)) && this.state.justVoted) {
      this.setState(state => ({ ...state, justVoted: false }));
    }
  }

  cache() {
    if (!this.props.holochainConnected) { return; }
    const votes = this.props.votes[this.props.address];

    if (!votes) {
      this.getVotes();
    }

    const myVote = this.props.myVotes[this.props.address];
    if (!myVote || this.state.justVoted) {
      this.getMyVote();
    }
  }

  getVotes() {
    this.props.fetchVotes(this.props.address, this.props.callZome);
  }

  getMyVote() {
    this.props.fetchMyVote(this.props.address, this.getInTermsOf(), this.props.callZome);
  }

  calculateWeight(keyHash, inTermsOf) {
    return VoteView.capWeight(
      inTermsOf.map(tag => (this.props.karmaMap[keyHash + ':' + tag] || 0)).reduce((a, b) => a + b, 0)
    );
  }

  calculateScore(votes, inTermsOf) {
    return votes.map(vote =>
      this.calculateWeight(vote.key_hash, inTermsOf)
    ).reduce((a, b) => a + b, 0);
  }

  getArrowPaths() {
    const myVotes = this.props.myVotes[this.props.address];
    if (myVotes) {
      const myVote = myVotes[util.inTermsOfToString(this.getInTermsOf())];
      if (myVote && myVote.Ok) {
        const voteAmount = myVote.Ok.fraction;
        const fromBottom = percent => `polygon(0px 100%, 0px ${(1 - percent) * 100}%, 100% ${(1 - percent) * 100}%, 100% 100%)`;
        const fromTop = percent => `polygon(0px 0px, 0px ${percent * 100}%, 100% ${percent * 100}%, 100% 0px)`;

        return {
          upArrowBackgroundPath: fromTop(1 - voteAmount),
          upArrowForegroundPath: fromBottom(voteAmount),
          downArrowBackgroundPath: fromBottom(1 + voteAmount),
          downArrowForegroundPath: fromTop(-voteAmount),
        };
      }
    }

    const polygonFull = 'polygon(0px 0px, 100% 0px, 100% 100%, 0px 100%)';
    const polygonEmpty = 'polygon(0px 0px, 0px 0px, 0px 0px, 0px 0px)';

    return {
      upArrowBackgroundPath: polygonFull,
      upArrowForegroundPath: polygonEmpty,
      downArrowBackgroundPath: polygonFull,
      downArrowForegroundPath: polygonEmpty,
    };
  }

  onClickVote = (positive, ref) => event => {
    const rect = ref.current.getBoundingClientRect();
    let whereClicked = (event.nativeEvent.clientY - rect.y) / rect.height;
    whereClicked = Math.max(.25, Math.min(.75, whereClicked));
    whereClicked = (whereClicked - .25) * 2;
    let weight;
    if (positive) {
      weight = 1 - whereClicked;
    } else {
      weight = -whereClicked;
    }

    this.props.castVote(this.props.address, util.getUtcUnixTime(), weight, this.getInTermsOf(), this.props.callZome)
      .then(this.getMyVote());
  }

  render() {
    const votes = this.props.votes[this.props.address];
    const inTermsOf = this.getInTermsOf();

    if (votes && inTermsOf) {
      if (votes.Ok) {
        const {
          upArrowBackgroundPath,
          upArrowForegroundPath,
          downArrowBackgroundPath,
          downArrowForegroundPath,
        } = this.getArrowPaths();
        return (
          <Box className={this.props.classes.root}>
            <ArrowUpwardIcon ref={this.backgroundUpArrow} onClick={this.onClickVote(true, this.backgroundUpArrow)} style={{ clipPath: upArrowBackgroundPath }} />
            <ArrowUpwardIcon ref={this.foregroundUpArrow} onClick={this.onClickVote(true, this.foregroundUpArrow)} style={{ clipPath: upArrowForegroundPath }} className={this.props.classes.upArrow} />
            <Typography variant="body1">{this.calculateScore(votes.Ok, inTermsOf)}</Typography>
            <ArrowDownwardIcon ref={this.backgroundDownArrow} onClick={this.onClickVote(false, this.backgroundDownArrow)} style={{ clipPath: downArrowBackgroundPath }} />
            <ArrowDownwardIcon ref={this.foregroundDownArrow} onClick={this.onClickVote(false, this.foregroundDownArrow)} style={{ clipPath: downArrowForegroundPath }} className={this.props.classes.downArrow} />
          </Box>
        );
      } else {
        return (
          <ErrorIcon />
        );
      }
    } else {
      return (
        <CircularProgress />
      );
    }
  }

  getInTermsOf() {
    return this.props.inTermsOf || [];
  }
}

VoteView.propTypes = {
  address: PropTypes.string.isRequired,
  inTermsOf: PropTypes.array,
  votes: PropTypes.object.isRequired,
  karmaMap: PropTypes.object.isRequired,
  holochainConnected: PropTypes.bool.isRequired,
  callZome: PropTypes.func,
  classes: PropTypes.object.isRequired,
  myVotes: PropTypes.object.isRequired,
  fetchMyVote: PropTypes.func.isRequired,
  castVote: PropTypes.func.isRequired,
  voteJustCast: PropTypes.object,
};

const propsMap = props => ({
  votes: props.votes,
  karmaMap: props.karmaMap,
  holochainConnected: props.holochainConnected,
  callZome: props.callZome,
  myVotes: props.myVotes,
  voteJustCast: props.voteJustCast,
});

export default connect(propsMap, { fetchVotes, fetchMyVote, castVote })(withStyles(styles)(VoteView));
