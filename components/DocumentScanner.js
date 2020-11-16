
import React, { createRef, useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    PermissionsAndroid,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Scanner, { RectangleOverlay } from 'react-native-rectangle-scanner';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../../constants';
import CropView from './CropView';

const requestCameraPermission = async () => {
    try {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
                title: "Camera Permission",
                message:
                    "App needs access to your camera ",
                buttonNeutral: "Ask Me Later",
                buttonNegative: "Cancel",
                buttonPositive: "OK"
            }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log("You can use the camera");
        } else {
            console.log("Camera permission denied");
        }
    } catch (err) {
        console.warn(err);
    }
};

const DocumentScanner = (props) => {
    const [image, setImage] = useState()
    const [flashEnabled, setFlashEnabled] = useState(false);
    const [showScannerView, setShowScannerView] = useState(false);
    const [didLoadInitialLayout, setDidLoadInitialLayout] = useState(false);
    const [detectedRectangle, setDetectedRectangle] = useState(false);
    const [isMultiTasking, setIsMultiTasking] = useState(false);
    const [loadingCamera, setLoadingCamera] = useState(false);
    const [processingImage, setProcessingImage] = useState(false);
    const [takingPicture, setTakingPicture] = useState(false);
    const [device, setDevice] = useState({
        initialized: false,
        hasCamera: false,
        permissionToUseCamera: false,
        flashIsAvailable: false,
        previewHeightPercent: 1,
        previewWidthPercent: 1,
    })

    const overlayFlashOpacity = useRef(new Animated.Value(0)).current
    const camera = createRef();
    let imageProcessorTimeout = null;

    useEffect(() => {
        requestCameraPermission()
    }, [])

    useEffect(() => {
        if (didLoadInitialLayout && !isMultiTasking) {
            turnOnCamera();
        }
        return () => { clearTimeout(imageProcessorTimeout) };
    }, [])

    useEffect(() => {
        if (didLoadInitialLayout) {
            if (isMultiTasking) return turnOffCamera(true);
            if (device.initialized) {
                if (!device.hasCamera) return turnOffCamera();
                if (!device.permissionToUseCamera) return turnOffCamera();
            }

            if (props.cameraIsOn === true && !showScannerView) {
                return turnOnCamera();
            }

            if (props.cameraIsOn === false && showScannerView) {
                return turnOffCamera(true);
            }

            if (props.cameraIsOn === undefined) {
                return turnOnCamera();
            }
        }
    }, [didLoadInitialLayout])

    // Called after the device gets setup. This lets you know some platform specifics
    // like if the device has a camera or flash, or even if you have permission to use the
    // camera. It also includes the aspect ratio correction of the preview
    const onDeviceSetup = (deviceDetails) => {
        const {
            hasCamera, permissionToUseCamera, flashIsAvailable, previewHeightPercent, previewWidthPercent,
        } = deviceDetails;
        setLoadingCamera(false);
        setDevice({
            loadingCamera: false,
            device: {
                initialized: true,
                hasCamera,
                permissionToUseCamera,
                flashIsAvailable,
                previewHeightPercent: previewHeightPercent || 1,
                previewWidthPercent: previewWidthPercent || 1,
            },
        });
    }

    // Determine why the camera is disabled.
    const getCameraDisabledMessage = () => {
        if (isMultiTasking) {
            return 'Camera is not allowed in multi tasking mode.';
        }

        if (device.initialized) {
            if (!device.hasCamera) {
                return 'Could not find a camera on the device.';
            }
            if (!device.permissionToUseCamera) {
                return 'Permission to use camera has not been granted.';
            }
        }
        return 'Failed to set up the camera.';
    }

    // On some android devices, the aspect ratio of the preview is different than
    // the screen size. This leads to distorted camera previews. This allows for correcting that.
    const getPreviewSize = useCallback(() => {
        // We use set margin amounts because for some reasons the percentage values don't align the camera preview in the center correctly.
        const heightMargin = (1 - device.previewHeightPercent) * SCREEN_HEIGHT / 2;
        const widthMargin = (1 - device.previewWidthPercent) * SCREEN_WIDTH / 2;
        if (SCREEN_HEIGHT > SCREEN_WIDTH) {
            // Portrait
            return {
                height: device.previewHeightPercent,
                width: device.previewWidthPercent,
                marginTop: heightMargin,
                marginLeft: widthMargin,
            };
        }

        // Landscape
        return {
            width: device.previewHeightPercent,
            height: device.previewWidthPercent,
            marginTop: widthMargin,
            marginLeft: heightMargin,
        };
    }, [])

    // Capture the current frame/rectangle. Triggers the flash animation and shows a
    // loading/processing state. Will not take another picture if already taking a picture.
    const capture = () => {
        if (takingPicture) return;
        if (processingImage) return;
        if (!detectedRectangle) return; //only captures if a rectangle is detected by the camera. 
        setTakingPicture(true)
        setProcessingImage(true)
        camera.current.capture();
        triggerSnapAnimation();

        // If capture failed, allow for additional captures
        imageProcessorTimeout = setTimeout(() => {
            if (takingPicture) {
                setTakingPicture(false)
            }
        }, 100);
    }

    // The picture was captured but still needs to be processed.
    const onPictureTaken = (event) => {
        setTakingPicture(false)
        props.onPictureTaken(event);
    }

    // The picture was taken and cached. You can now go on to using it.
    const onPictureProcessed = (event) => {
        props.onPictureProcessed(event);
        setImage(event)
        setTakingPicture(false);
        setProcessingImage(false);
        setShowScannerView(props.cameraIsOn || false)
    }

    // Flashes the screen on capture
    const triggerSnapAnimation = () => {
        Animated.sequence([
            Animated.timing(overlayFlashOpacity, { toValue: 0.2, duration: 100, useNativeDriver: false }),
            Animated.timing(overlayFlashOpacity, { toValue: 0, duration: 50, useNativeDriver: false }),
            Animated.timing(overlayFlashOpacity, { toValue: 0.6, delay: 100, duration: 120, useNativeDriver: false }),
            Animated.timing(overlayFlashOpacity, { toValue: 0, duration: 90, useNativeDriver: false }),
        ]).start();
    }

    // Hides the camera view. If the camera view was shown and onDeviceSetup was called,
    // but no camera was found, it will not uninitialize the camera state.
    const turnOffCamera = (shouldUninitializeCamera = false) => {
        if (shouldUninitializeCamera && device.initialized) {
            setShowScannerView(false);
            setDevice(device => ({
                ...device, initialized: false
            }));
        } else if (showScannerView) {
            setShowScannerView(false);
        }
    }

    // Will show the camera view which will setup the camera and start it.
    // Expect the onDeviceSetup callback to be called
    const turnOnCamera = () => {
        if (!showScannerView) {
            setShowScannerView(true);
            setLoadingCamera(true)
        }
    }

    // Renders the flashlight button. Only shown if the device has a flashlight.
    const renderFlashControl = () => {
        // if (!device.flashIsAvailable) return null;
        return (
            <TouchableOpacity
                style={[styles.flashControl, { backgroundColor: flashEnabled ? '#FFFFFF80' : '#00000080' }]}
                activeOpacity={0.8}
                onPress={() => setFlashEnabled(prev => !prev)}
            >
                <Icon name="ios-flashlight" style={[styles.buttonIcon, { fontSize: 28, color: flashEnabled ? '#333' : '#FFF' }]} />
            </TouchableOpacity>
        );
    }

    // Renders the camera controls. This will show controls on the side for large tablet screens
    // or on the bottom for phones. (For small tablets it will adjust the view a little bit).
    const renderCameraControls = () => {
        const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
        const isPhone = aspectRatio > 1.6;
        const cameraIsDisabled = takingPicture || processingImage;
        const disabledStyle = { opacity: cameraIsDisabled ? 0.8 : 1 };
        if (!isPhone) {
            if (SCREEN_HEIGHT < 500) {
                return (
                    <View style={styles.buttonContainer}>
                        <View style={[styles.buttonActionGroup, { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 28 }]}>
                            {renderFlashControl()}
                            {props.hideSkip ? null : (
                                <View style={[styles.buttonGroup, { marginLeft: 8 }]}>
                                    <TouchableOpacity
                                        style={[styles.button, disabledStyle]}
                                        onPress={cameraIsDisabled ? () => null : props.onSkip}
                                        activeOpacity={0.8}
                                    >
                                        <Icon name="arrow-forward-circle" size={40} color="white" style={styles.buttonIcon} />
                                        <Text style={styles.buttonText}>Skip</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                        <View style={[styles.cameraOutline, disabledStyle]}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={styles.cameraButton}
                                onPress={capture}
                            />
                        </View>
                        <View style={[styles.buttonActionGroup, { marginTop: 28 }]}>
                            <View style={styles.buttonGroup}>
                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={props.onCancel}
                                    activeOpacity={0.8}
                                >
                                    <Icon name="ios-close-circle" size={40} style={styles.buttonIcon} />
                                    <Text style={styles.buttonText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                );
            }
            return (
                <View style={styles.buttonContainer}>
                    <View style={[styles.buttonActionGroup, { justifyContent: 'flex-end', marginBottom: 20 }]}>
                        {renderFlashControl()}
                    </View>
                    <View style={[styles.cameraOutline, disabledStyle]}>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={styles.cameraButton}
                            onPress={capture}
                        />
                    </View>
                    <View style={[styles.buttonActionGroup, { marginTop: 28 }]}>
                        <View style={styles.buttonGroup}>
                            {props.hideSkip ? null : (
                                <TouchableOpacity
                                    style={[styles.button, disabledStyle]}
                                    onPress={cameraIsDisabled ? () => null : props.onSkip}
                                    activeOpacity={0.8}
                                >
                                    <Icon name="arrow-forward-circle" size={40} color="white" style={styles.buttonIcon} />
                                    <Text style={styles.buttonText}>Skip</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={styles.buttonGroup}>
                            <TouchableOpacity
                                style={styles.button}
                                onPress={props.onCancel}
                                activeOpacity={0.8}
                            >
                                <Icon name="ios-close-circle" size={40} style={styles.buttonIcon} />
                                <Text style={styles.buttonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            );
        }

        return (
            <>
                <View style={styles.buttonBottomContainer}>
                    <View style={styles.buttonGroup}>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={props.onCancel}
                            activeOpacity={0.8}
                        >
                            <Icon name="ios-close-circle" size={40} style={styles.buttonIcon} />
                            <Text style={styles.buttonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.cameraOutline, disabledStyle]}>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={styles.cameraButton}
                            onPress={capture}
                        />
                    </View>
                    <View>
                        <View style={[styles.buttonActionGroup, { justifyContent: 'flex-end', marginBottom: props.hideSkip ? 0 : 16 }]}>
                            {renderFlashControl()}
                        </View>
                        <View style={styles.buttonGroup}>
                            {props.hideSkip ? null : (
                                <TouchableOpacity
                                    style={[styles.button, disabledStyle]}
                                    onPress={cameraIsDisabled ? () => null : props.onSkip}
                                    activeOpacity={0.8}
                                >
                                    <Icon name="arrow-forward-circle" size={40} color="white" style={styles.buttonIcon} />
                                    <Text style={styles.buttonText}>Skip</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </>
        );
    }

    // Renders the camera controls or a loading/processing state
    const renderCameraOverlay = () => {
        let loadingState = null;
        if (loadingCamera) {
            loadingState = (
                <View style={styles.overlay}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator color="white" />
                        <Text style={styles.loadingCameraMessage}>Loading Camera</Text>
                    </View>
                </View>
            );
        } else if (processingImage) {
            loadingState = (
                <View style={styles.overlay}>
                    <View style={styles.loadingContainer}>
                        <View style={styles.processingContainer}>
                            <ActivityIndicator color="#333333" size="large" />
                            <Text style={{ color: '#333333', fontSize: 30, marginTop: 10 }}>Processing</Text>
                        </View>
                    </View>
                </View>
            );
        }

        return (
            <>
                {loadingState}
                <SafeAreaView style={[styles.overlay]}>
                    {renderCameraControls()}
                </SafeAreaView>
            </>
        );
    }

    // Renders either the camera view, a loading state, or an error message
    // letting the user know why camera use is not allowed
    const renderCameraView = () => {
        if (showScannerView) {
            const previewSize = getPreviewSize();
            let rectangleOverlay = null;
            if (!loadingCamera && !processingImage) {
                rectangleOverlay = (
                    <RectangleOverlay
                        detectedRectangle={detectedRectangle}
                        // previewRatio={previewSize}
                        backgroundColor="rgba(255,181,6, 0.2)"
                        borderColor="rgb(255,181,6)"
                        borderWidth={4}
                        // == These let you auto capture and change the overlay style on detection ==
                        detectedBackgroundColor="rgba(255,181,6, 0.3)"
                        detectedBorderWidth={6}
                        detectedBorderColor="rgb(255,218,124)"
                        onDetectedCapture={capture}
                        allowDetection
                    /> //Change view style 'top' according to the need if overlay is not matching the corners of the document. See https://github.com/HarvestProfit/react-native-rectangle-scanner/issues/22.
                );
            }

            return (
                <View style={{ backgroundColor: 'rgba(0, 0, 0, 0)', position: 'relative', marginTop: previewSize.marginTop, marginLeft: previewSize.marginLeft, height: `${previewSize.height * 100}%`, width: `${previewSize.width * 100}%` }}>
                    <Scanner
                        onPictureTaken={onPictureTaken}
                        onPictureProcessed={onPictureProcessed}
                        enableTorch={flashEnabled}
                        ref={camera}
                        capturedQuality={1}
                        onRectangleDetected={({ detectedRectangle }) => setDetectedRectangle(detectedRectangle)}
                        onDeviceSetup={onDeviceSetup}
                        onTorchChanged={({ enabled }) => setFlashEnabled(enabled)}
                        style={styles.scanner}
                    />
                    {rectangleOverlay}
                    <Animated.View style={{ ...styles.overlay, backgroundColor: 'white', opacity: overlayFlashOpacity }} />
                    {renderCameraOverlay()}
                </View>
            );
        }

        let message = null;
        if (loadingCamera) {
            message = (
                <View style={styles.overlay}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator color="white" />
                        <Text style={styles.loadingCameraMessage}>Loading Camera</Text>
                    </View>
                </View>
            );
        } else {
            message = (
                <Text style={styles.cameraNotAvailableText}>
                    {getCameraDisabledMessage()}
                </Text>
            );
        }

        return (
            <View style={styles.cameraNotAvailableContainer}>
                {message}
                <View style={styles.buttonBottomContainer}>
                    <View style={styles.buttonGroup}>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={props.onCancel}
                            activeOpacity={0.8}
                        >
                            <Icon name="ios-close-circle" size={40} style={styles.buttonIcon} />
                            <Text style={styles.buttonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.buttonGroup}>
                        {props.hideSkip ? null : (
                            <TouchableOpacity
                                style={[styles.button, { marginTop: 8 }]}
                                onPress={props.onSkip}
                                activeOpacity={0.8}
                            >
                                <Icon name="arrow-forward-circle" size={40} color="white" style={styles.buttonIcon} />
                                <Text style={styles.buttonText}>Skip</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

        );
    }

    if (image) {
        return (
            <CropView image={image.initialImage} detectedRectangle={detectedRectangle} />
        )
    }
    //crop view is used because react-native-rectangle-scanner returns improperly scaled image.
    //image.croppedImage will return the cropped image by react-native-rectangle-scanner.

    return (
        <View
            style={styles.container}
            onLayout={(event) => {
                // This is used to detect multi tasking mode on iOS/iPad
                // Camera use is not allowed
                props.onLayout(event);
                if (didLoadInitialLayout && Platform.OS === 'ios') {
                    const screenWidth = SCREEN_WIDTH;
                    const isMultiTasking = (
                        Math.round(event.nativeEvent.layout.width) < Math.round(screenWidth)
                    );
                    if (isMultiTasking) {
                        setIsMultiTasking(true);
                        setLoadingCamera(false);
                    } else {
                        setIsMultiTasking(false);
                    }
                } else {
                    setDidLoadInitialLayout(true)
                }
            }}
        >
            <StatusBar backgroundColor="black" barStyle="light-content" hidden={Platform.OS !== 'android'} />
            {renderCameraView()}
        </View>
    );
}

export default DocumentScanner;


const styles = StyleSheet.create({
    button: {
        alignItems: 'center',
        height: 70,
        justifyContent: 'center',
        width: 65,
    },
    buttonActionGroup: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    buttonBottomContainer: {
        alignItems: 'flex-end',
        bottom: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        left: 25,
        position: 'absolute',
        right: 25,
    },
    buttonContainer: {
        alignItems: 'flex-end',
        bottom: 25,
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'absolute',
        right: 25,
        top: 25,
    },
    buttonGroup: {
        backgroundColor: '#00000080',
        borderRadius: 17,
    },
    buttonIcon: {
        color: 'white',
        fontSize: 22,
        marginBottom: 3,
        textAlign: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 13,
    },
    buttonTopContainer: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        justifyContent: 'space-between',
        left: 25,
        position: 'absolute',
        right: 25,
        top: 40,
    },
    cameraButton: {
        backgroundColor: 'white',
        borderRadius: 50,
        flex: 1,
        margin: 3,
    },
    cameraNotAvailableContainer: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        marginHorizontal: 15,
    },
    cameraNotAvailableText: {
        color: 'white',
        fontSize: 25,
        textAlign: 'center',
    },
    cameraOutline: {
        borderColor: 'white',
        borderRadius: 50,
        borderWidth: 3,
        height: 70,
        width: 70,
    },
    container: {
        backgroundColor: 'black',
        flex: 1,
    },
    flashControl: {
        alignItems: 'center',
        borderRadius: 30,
        height: 50,
        justifyContent: 'center',
        margin: 8,
        paddingTop: 7,
        width: 50,
    },
    loadingCameraMessage: {
        color: 'white',
        fontSize: 18,
        marginTop: 10,
        textAlign: 'center',
    },
    loadingContainer: {
        alignItems: 'center', flex: 1, justifyContent: 'center',
    },
    overlay: {
        bottom: 0,
        flex: 1,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
    },
    processingContainer: {
        alignItems: 'center',
        backgroundColor: 'rgba(220, 220, 220, 0.7)',
        borderRadius: 16,
        height: 140,
        justifyContent: 'center',
        width: 200,
    },
    scanner: {
        flex: 1,
    },
});