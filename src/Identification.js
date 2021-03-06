import React, { Component } from "react";
import * as tmImage from "@teachablemachine/image";
import allBirdsWithCommonNames from "./allBirdsWithCommonNames.json";
import placeholder from "./placeholder.jpg";
import { VariableSizeList } from "react-window";
import PropTypes from "prop-types";
import axios from "axios";
import APItoken from "./IUCNToken";
import imageModelIDs from "./imageModelIDs.json";
import AudioPlayer from "material-ui-audio-player";
// material
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import InputAdornment from "@material-ui/core/InputAdornment";
import IconButton from "@material-ui/core/IconButton";
import Button from "@material-ui/core/Button";
import Snackbar from "@material-ui/core/Snackbar";
import Slide from "@material-ui/core/Slide";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardMedia from "@material-ui/core/CardMedia";
import CardContent from "@material-ui/core/CardContent";
import CardActions from "@material-ui/core/CardActions";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import Autocomplete from "@material-ui/lab/Autocomplete";
import { useTheme } from "@material-ui/core/styles";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import ListSubheader from "@material-ui/core/ListSubheader";
// material icons
import SearchIcon from "@material-ui/icons/Search";
import PhotoCameraIcon from "@material-ui/icons/PhotoCamera";
import CloseIcon from "@material-ui/icons/Close";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
// map
import { WorldMap } from "react-svg-worldmap";
// css
import "./stylesheets/Identification.css";

//copy pasted from mui website to virtualize dropdown
const LISTBOX_PADDING = 8; // px
function renderRow(props) {
  const { data, index, style } = props;
  return React.cloneElement(data[index], {
    style: {
      ...style,
      top: style.top + LISTBOX_PADDING,
    },
  });
}
const OuterElementContext = React.createContext({});
const OuterElementType = React.forwardRef((props, ref) => {
  const outerProps = React.useContext(OuterElementContext);
  return <div ref={ref} {...props} {...outerProps} />;
});
function useResetCache(data) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current != null) {
      ref.current.resetAfterIndex(0, true);
    }
  }, [data]);
  return ref;
}
const ListboxComponent = React.forwardRef(function ListboxComponent(
  props,
  ref
) {
  const { children, ...other } = props;
  const itemData = React.Children.toArray(children);
  const theme = useTheme();
  const smUp = useMediaQuery(theme.breakpoints.up("sm"), { noSsr: true });
  const itemCount = itemData.length;
  const itemSize = smUp ? 36 : 48;

  const getChildSize = (child) => {
    if (React.isValidElement(child) && child.type === ListSubheader) {
      return 48;
    }

    return itemSize;
  };
  const getHeight = () => {
    if (itemCount > 8) {
      return 8 * itemSize;
    }
    return itemData.map(getChildSize).reduce((a, b) => a + b, 0);
  };
  const gridRef = useResetCache(itemCount);
  return (
    <div ref={ref}>
      <OuterElementContext.Provider value={other}>
        <VariableSizeList
          itemData={itemData}
          height={getHeight() + 2 * LISTBOX_PADDING}
          width="100%"
          ref={gridRef}
          outerElementType={OuterElementType}
          innerElementType="ul"
          itemSize={(index) => getChildSize(itemData[index])}
          overscanCount={5}
          itemCount={itemCount}
        >
          {renderRow}
        </VariableSizeList>
      </OuterElementContext.Provider>
    </div>
  );
});
ListboxComponent.propTypes = {
  children: PropTypes.node,
};
const renderGroup = (params) => [
  <ListSubheader key={params.key} component="div">
    {params.group}
  </ListSubheader>,
  params.children,
];

class Identification extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchValue: null,
      searchInputValue: "",
      showingResults: false,
      display: {},
      predictedResult: {},
      snackbarOpen: false,
      snackbarMessage: "",
      accordions: [
        { name: "Taxonomy", isOpen: true },
        { name: "Geographic Range", isOpen: false },
        { name: "Population", isOpen: false },
        { name: "Habitat and Ecology", isOpen: false },
        { name: "Threats", isOpen: false },
        { name: "Conservation Actions", isOpen: false },
      ],
    };
    this.loadUniqueCommonNames();
  }

  loadUniqueCommonNames = () => {
    this.allCommonNames = [];
    allBirdsWithCommonNames.forEach((bird) => {
      this.allCommonNames.push(...bird.commonNames);
    });
    this.uniqueCommonNames = [...new Set(this.allCommonNames)];
    this.autocompleteOptions = this.uniqueCommonNames.sort((a, b) =>
      a.toUpperCase().localeCompare(b.toUpperCase())
    );
  };

  handleSearchValueChange = (event, newValue) => {
    this.setState({
      searchValue: newValue,
    });
  };

  handleSearchInputValueChange = (event, newValue) => {
    this.setState({
      searchInputValue: newValue,
    });
  };

  handleSearchInputsClear = () => {
    this.setState(() => {
      return { searchValue: null, searchInputValue: "" };
    });
  };

  handleSearchSubmit = (e) => {
    e.preventDefault();
    if (this.state.searchValue) {
      let birdID = allBirdsWithCommonNames.find((ele) => {
        return ele.commonNames.includes(this.state.searchValue);
      }).id;
      this.fetchDetailsFromAPI(birdID);
    } else {
      this.setState(() => {
        return {
          snackbarOpen: true,
          snackbarMessage: "Empty Input",
        };
      });
    }
  };

  handleClickOnCameraIcon = () => {
    const fileSelector = document.createElement("input");
    fileSelector.setAttribute("type", "file");
    fileSelector.click();
    fileSelector.onchange = this.selectedImageToHTMLElement;
  };

  selectedImageToHTMLElement = (e) => {
    const fReader = new FileReader();
    this.selectedImageHTML = document.createElement("img");
    fReader.readAsDataURL(e.target.files[0]);
    fReader.onloadend = (event) => {
      this.selectedImageHTML.src = event.target.result;
    };
    this.handleImageSubmit();
    this.setState(() => {
      return {
        showingResults: false,
        display: {},
        snackbarOpen: true,
        snackbarMessage: "Image Loaded!",
      };
    });
  };

  handleImageSubmit = async () => {
    const URL = "https://teachablemachine.withgoogle.com/models/-7mqg1t6m/";
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";
    const model = await tmImage.load(modelURL, metadataURL);
    const allPredictions = await model.predict(this.selectedImageHTML, false);
    const sortedPredictions = allPredictions.sort(
      (element1, element2) => element2.probability - element1.probability
    );
    this.handleCloseResults();
    this.findBirdIDFromImage(sortedPredictions[0]);
  };

  findBirdIDFromImage = (prediction) => {
    let birdID = imageModelIDs.find((ele) => {
      return ele.bird === prediction.className;
    }).id;

    this.fetchDetailsFromAPI(birdID, prediction);
  };

  fetchDetailsFromAPI = (birdID, prediction) => {
    axios
      .get(
        "https://apiv3.iucnredlist.org/api/v3/species/id/" +
          birdID +
          "?token=" +
          APItoken
      )
      .then((response) => {
        let display = {};
        if (prediction) {
          display.prediction = prediction;
        }
        display.title = response.data.result[0].main_common_name;
        display.taxonomy = {
          class: response.data.result[0].class,
          family: response.data.result[0].family,
          genus: response.data.result[0].genus,
          kingdom: response.data.result[0].kingdom,
          order: response.data.result[0].order,
          phylum: response.data.result[0].phylum,
          scientific_name: response.data.result[0].scientific_name,
        };
        axios
          .get(
            "https://apiv3.iucnredlist.org/api/v3/species/countries/id/" +
              birdID +
              "?token=" +
              APItoken
          )
          .then((response) => {
            display.geographicRange = response.data.result.map((ele) => {
              return { country: ele.code, value: 1 };
            });
            this.setState(() => {
              return {
                display,
                showingResults: true,
              };
            });
          });
      })
      .catch((error) => {
        this.setState(() => {
          return {
            snackbarOpen: true,
            snackbarMessage: error,
          };
        });
      });
  };

  handleAccordianToggle = (name) => {
    this.setState((curState) => {
      let accordionsCopy = JSON.parse(JSON.stringify(curState.accordions));
      let toggleThis = accordionsCopy.find((ele) => ele.name === name);
      toggleThis.isOpen
        ? (toggleThis.isOpen = false)
        : (toggleThis.isOpen = true);
      return {
        accordions: accordionsCopy,
      };
    });
  };

  handleCloseResults = () => {
    this.setState(() => {
      return { showingResults: false, display: {} };
    });
  };

  handleSnackbarClose = () => {
    this.setState(() => {
      return { snackbarOpen: false };
    });
  };

  render = () => {
    return (
      <div className="Identification">
        <Typography component="h1" variant="h2">
          Bird Identification
        </Typography>

        <form noValidate autoComplete="off" onSubmit={this.handleSearchSubmit}>
          <Autocomplete
            value={this.state.searchValue}
            onChange={this.handleSearchValueChange}
            inputValue={this.state.searchInputValue}
            onInputChange={this.handleSearchInputValueChange}
            disableClearable
            forcePopupIcon={false}
            disableListWrap
            ListboxComponent={ListboxComponent}
            renderGroup={renderGroup}
            options={this.autocompleteOptions}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search"
                variant="outlined"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <InputAdornment position="end">
                      {this.state.searchInputValue && (
                        <IconButton onClick={this.handleSearchInputsClear}>
                          <CloseIcon />
                        </IconButton>
                      )}
                      <IconButton onClick={this.handleClickOnCameraIcon}>
                        <PhotoCameraIcon />
                      </IconButton>
                      <IconButton onClick={this.handleSearchSubmit}>
                        <SearchIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            )}
            renderOption={(option) => <Typography noWrap>{option}</Typography>}
          />
        </form>
        {!this.state.showingResults && (
          <div className="Identification-Links">
            <Typography>Location-Wise Search</Typography>
            <Typography>Endangered Birds</Typography>
            <Typography>Featured bird: White-headed Duck</Typography>
          </div>
        )}
        {this.state.showingResults && (
          <Slide
            direction="up"
            in={this.state.showingResults}
            mountOnEnter
            unmountOnExit
            className="Identification-Results"
          >
            <Card elevation={4}>
              <CardHeader
                title={`${this.state.display.title}`}
                subheader={
                  this.state.display.prediction
                    ? `Prediction: ${
                        this.state.display.prediction.className
                      }, ${this.state.display.prediction.probability * 100}%`
                    : ""
                }
              />
              <CardMedia image={placeholder} style={{ paddingTop: "56.25%" }} />
              {true && (
                <CardContent>
                  <AudioPlayer
                    src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
                    volume={false}
                    width="inital"
                  />
                </CardContent>
              )}
              <CardContent>
                <Accordion
                  expanded={
                    this.state.accordions.find((ele) => ele.name === "Taxonomy")
                      .isOpen
                  }
                >
                  <AccordionSummary
                    onClick={() => this.handleAccordianToggle("Taxonomy")}
                    expandIcon={<ExpandMoreIcon />}
                  >
                    <Typography>Taxonomy</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <div className="Identification-Taxonomy">
                      <Typography>Scientific Name</Typography>
                      <Typography>
                        {this.state.display.taxonomy.scientific_name}
                      </Typography>

                      <Typography>Kingdom</Typography>
                      <Typography>
                        {this.state.display.taxonomy.kingdom}
                      </Typography>

                      <Typography>Phylum</Typography>
                      <Typography>
                        {this.state.display.taxonomy.phylum}
                      </Typography>

                      <Typography>Class</Typography>
                      <Typography>
                        {this.state.display.taxonomy.class}
                      </Typography>

                      <Typography>Order</Typography>
                      <Typography>
                        {this.state.display.taxonomy.order}
                      </Typography>

                      <Typography>Family</Typography>
                      <Typography>
                        {this.state.display.taxonomy.family}
                      </Typography>

                      <Typography>Genus</Typography>
                      <Typography>
                        {this.state.display.taxonomy.genus}
                      </Typography>
                    </div>
                  </AccordionDetails>
                </Accordion>

                <Accordion
                  expanded={
                    this.state.accordions.find(
                      (ele) => ele.name === "Geographic Range"
                    ).isOpen
                  }
                >
                  <AccordionSummary
                    onClick={() =>
                      this.handleAccordianToggle("Geographic Range")
                    }
                    expandIcon={<ExpandMoreIcon />}
                  >
                    <Typography>Geographic Range</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <div className="Identification-GeographicRange">
                      <WorldMap
                        color="#1976d2"
                        data={this.state.display.geographicRange}
                        frame
                        tooltipTextFunction={(countryName) => countryName}
                      />
                    </div>
                  </AccordionDetails>
                </Accordion>

                <Accordion
                  expanded={
                    this.state.accordions.find(
                      (ele) => ele.name === "Population"
                    ).isOpen
                  }
                >
                  <AccordionSummary
                    onClick={() => this.handleAccordianToggle("Population")}
                    expandIcon={<ExpandMoreIcon />}
                  >
                    <Typography>Population</Typography>
                  </AccordionSummary>
                  <AccordionDetails></AccordionDetails>
                </Accordion>

                <Accordion
                  expanded={
                    this.state.accordions.find(
                      (ele) => ele.name === "Habitat and Ecology"
                    ).isOpen
                  }
                >
                  <AccordionSummary
                    onClick={() =>
                      this.handleAccordianToggle("Habitat and Ecology")
                    }
                    expandIcon={<ExpandMoreIcon />}
                  >
                    <Typography>Habitat and Ecology</Typography>
                  </AccordionSummary>
                  <AccordionDetails></AccordionDetails>
                </Accordion>

                <Accordion
                  expanded={
                    this.state.accordions.find((ele) => ele.name === "Threats")
                      .isOpen
                  }
                >
                  <AccordionSummary
                    onClick={() => this.handleAccordianToggle("Threats")}
                    expandIcon={<ExpandMoreIcon />}
                  >
                    <Typography>Threats</Typography>
                  </AccordionSummary>
                  <AccordionDetails></AccordionDetails>
                </Accordion>

                <Accordion
                  expanded={
                    this.state.accordions.find(
                      (ele) => ele.name === "Conservation Actions"
                    ).isOpen
                  }
                >
                  <AccordionSummary
                    onClick={() =>
                      this.handleAccordianToggle("Conservation Actions")
                    }
                    expandIcon={<ExpandMoreIcon />}
                  >
                    <Typography>Conservation Actions</Typography>
                  </AccordionSummary>
                  <AccordionDetails></AccordionDetails>
                </Accordion>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  color="secondary"
                  onClick={this.handleCloseResults}
                >
                  Close
                </Button>
              </CardActions>
            </Card>
          </Slide>
        )}

        <Snackbar
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          open={this.state.snackbarOpen}
          autoHideDuration={6000}
          onClose={this.handleSnackbarClose}
          message={this.state.snackbarMessage}
          action={
            <React.Fragment>
              <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={this.handleSnackbarClose}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </React.Fragment>
          }
        />
      </div>
    );
  };
}

export default Identification;
