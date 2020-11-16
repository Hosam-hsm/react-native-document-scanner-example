// module.exports = {
//     dependency: {
//         platforms: {
//             android: {
//                 packageImportPath: 'import fr.michaelvilleneuve.customcrop.RNCustomCropPackage;',
//                 packageInstance: 'new RNCustomCropPackage()',
//             },
//         },
//     },
// }; //add react-native.config.js in node modules/react-native-perspective-image-cropper after installing this package to avoid package errors


import { useNavigation } from "@react-navigation/native";
import React, { useRef, useState } from "react";
import { TouchableOpacity, View, Text, StyleSheet, Image, } from "react-native";
import CustomCrop from "react-native-perspective-image-cropper";
import { BLUE } from "../../constants";

const CropView = ({ image, detectedRectangle }) => {
    const navigation = useNavigation()
    const [initialImage, setInitialImage] = useState(image)
    const [height, setHeight] = useState(detectedRectangle?.dimensions.height)
    const [width, setWidth] = useState(detectedRectangle?.dimensions.width)
    const [croppedImage, setCroppedImage] = useState()
    const [rectangleCoordinates, setRectangleCoordinates] = useState(detectedRectangle)
    const cropRef = useRef()

    const updateImage = (image, newCoordinates) => {
        setRectangleCoordinates(newCoordinates)
        setCroppedImage(image)
    }

    const onPressUndo = () => {
        setCroppedImage()
    }

    const onPressDone = () => {
        console.log(croppedImage)
        //send croppedImage to the backend. it will be base64 image.
        navigation.popToTop()
    }

    const onPressCrop = () => {
        cropRef.current.crop();
    }

    return (
        <View style={styles.container}>
            {!croppedImage ?
                <CustomCrop
                    updateImage={updateImage}
                    rectangleCoordinates={rectangleCoordinates}
                    initialImage={initialImage}
                    height={height}
                    width={width}
                    ref={cropRef}
                    overlayColor="rgba(18,190,210, 1)"
                    overlayStrokeColor="rgba(20,190,210, 1)"
                    handlerColor="rgba(20,150,160, 1)"
                    enablePanStrict={false}
                />
                :
                <Image style={styles.croppedImage} source={{ uri: `data:image/png;base64,${croppedImage}` }} /> //show image after cropping
            }

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    disabled={croppedImage ? false : true}
                    style={[styles.button, { backgroundColor: croppedImage ? BLUE : "#ebecf0" }]}
                    onPress={onPressUndo}>
                    <Text style={[styles.buttonText]}>UNDO</Text>
                </TouchableOpacity>
                {
                    croppedImage ?
                        <TouchableOpacity
                            style={[styles.button]}
                            onPress={onPressDone}>
                            <Text style={[styles.buttonText]}>DONE</Text>
                        </TouchableOpacity>
                        :
                        <TouchableOpacity
                            style={[styles.button]}
                            onPress={onPressCrop}>
                            <Text style={[styles.buttonText]}>CROP</Text>
                        </TouchableOpacity>
                }
            </View>
        </View>
    );
}

export default CropView;

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        flex: 1,
        backgroundColor: '#fff'
    },
    buttonContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        bottom: 10,
    },
    croppedImage: {
        height: '40%',
        width: '100%',
        resizeMode: 'contain',
        transform: [{ rotate: '-90deg' }]
    },
    button: {
        backgroundColor: BLUE,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        width: 150,
        borderRadius: 5
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15
    }
})