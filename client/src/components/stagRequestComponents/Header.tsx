import React from "react";
import { AppBar, Toolbar, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles((theme) => ({
  appBar: {
    backgroundColor: theme.palette.primary.main,
  },
  title: {
    flexGrow: 1,
    textDecoration: "none",
    color: "white",
  },
  link: {
    color: "white",
    textDecoration: "none",
  },
  button: {
    boxShadow: "none",
  },
}));

const Header = () => {
  const classes = useStyles();

  return (
    <AppBar position="static" className={classes.appBar}>
      <Toolbar>
        <Typography
          variant="h6"
          className={classes.title}
          component={Link}
          to="/"
        >
          Sephora oneTag
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
