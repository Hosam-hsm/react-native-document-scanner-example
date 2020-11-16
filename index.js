import * as React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Home } from './screens';

const Stack = createStackNavigator();

function DocumentScannerNavigator() {
    return (
        <Stack.Navigator>
            <Stack.Screen name="DocumentScannerHome" options={{ headerShown: false }} component={Home} />
        </Stack.Navigator>
    );
}

export default DocumentScannerNavigator;