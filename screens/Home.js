import React from "react";
import { useNavigation } from '@react-navigation/native';
import { DocumentScanner } from "../components";

const Home = ({ }) => {
    const navigation = useNavigation()

    return (
        <DocumentScanner
            onPictureProcessed={(event) => { }}
            onPictureTaken={(event) => { }}
            onLayout={(event) => { }}
            onSkip={() => { }}
            onCancel={() => navigation.goBack()}
            hideSkip={true}
        />
    )
};
export default Home;
