import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

export function PaymentSuccessScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Successful 🎉</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Home")}
      >
        <Text style={styles.buttonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, justifyContent:"center", alignItems:"center", padding:20 },
  title:{ fontSize:24, fontWeight:"bold", marginBottom:20 },
  button:{ padding:10, backgroundColor:"#7c3aed", borderRadius:6 },
  buttonText:{ color:"white", fontSize:18 }
});
