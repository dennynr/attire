import React, { useState, useRef, useEffect } from 'react';
import { HeaderKatalog } from '../components/Index';
import {
  GluestackUIProvider,
  Pressable,
  Image,
  FlatList,
  SafeAreaView,
  Heading,
  Box,
  Text,
  ScrollView,
  HStack,
  VStack,
} from "@gluestack-ui/themed";
import { Dimensions } from 'react-native';
import MasonryList from '@react-native-seoul/masonry-list';
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import datas from '../data/datas';
import 'react-native-gesture-handler';
import firebase from '../firebase'
import { Entypo, FontAwesome } from "@expo/vector-icons";

const Katalog = ({ route }) => {
  const navigation = useNavigation();
  const [entries, setEntries] = useState(datas);
  const [userData, setUserData] = useState('');
  const [costume, setCostumeData] = useState([]);
  const [searchText, setSearchText] = useState('');
  console.log(costume.costumeCategory)

  useEffect(() => {
    getUserData();
    if (route.params && route.params.category) {
      getCostume(route.params.category);
    } else {
      // Handle the case when category is not provided, fetch all costumes
      getCostume();
    }
  }, []);



  const getUserData = async () => {
    try {
      const userDataString = await AsyncStorage.getItem("user-data");
      // console.log("Data from AsyncStorage:", userDataString)
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        setUserData(userData);
        const uid = userData;

        // Menampilkan UID ke konsol
        // console.log("User UID from AsyncStorage:",  userData);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getDownloadUrl = async (filename) => {
    const storageRef = firebase.storage().ref();
    const costumeImageRef = storageRef.child(filename);

    try {
      const downloadUrl = await costumeImageRef.getDownloadURL();
      return downloadUrl;
    } catch (error) {
      console.error("Error getting download URL:", error);
      return ''; // Return an empty string or handle the error accordingly
    }
  };

  const getCostume = async (category) => {
    const costumeRef = firebase.database().ref("costumes/");

    try {
      const snapshot = await costumeRef.once("value");
      const costumeData = snapshot.val();

      if (costumeData) {
        const availableCostumes = await Promise.all(
          Object.entries(costumeData)
            .filter(([_, costume]) => {
              // Check if the costume matches the category filter
              if (!category || costume.costumeCategory === category) {
                return costume.username !== userData.username && costume.status !== "Dipinjam";
              }
              return false;
            })
            .map(async ([costumeId, costume]) => {
              const imageUrl = await getDownloadUrl(costume.filename);

              const ratings = costume.rating || {};
              let totalRating = 0;
              let numberOfRatings = 0;

              for (const ratingId in ratings) {
                if (ratings.hasOwnProperty(ratingId)) {
                  const ratingValue = ratings[ratingId]?.rating;
                  if (typeof ratingValue === 'number') {
                    totalRating += ratingValue;
                    numberOfRatings++;
                  }
                }
              }

              const averageRating = numberOfRatings > 0 ? (totalRating / numberOfRatings).toFixed(1) : '0';

              return { costumeId, ...costume, imageUrl, averageRating };
            })
        );

        console.log('Available Costumes:', availableCostumes);

        setCostumeData(availableCostumes);

        return availableCostumes;
      } else {
        setCostumeData([]);
        return [];
      }
    } catch (error) {
      console.error("Error fetching costumes data:", error);
      setCostumeData([]);
      return [];
    }
  };



  const ItemKu = ({ costume }) => {
    const { costumeName, costumeDescription } = costume;

    const isMatch =
      costumeName.toLowerCase().includes(searchText.toLowerCase()) ||
      costumeDescription.toLowerCase().includes(searchText.toLowerCase());

    return isMatch ? (
      <Pressable onPress={() => navigation.navigate('DetailBarang', { item: costume })}   >
        <Box backgroundColor='white' rounded={10} width={'90%'} margin={10} p={0} hardShadow={1}>
          <Image role='img' alt='gambar' resizeMode='cover' width={'100%'} height={150} source={{ uri: costume.imageUrl }} />
          <Box p={5}>
            <HStack >
              <Box>
                <Text flex={2} fontSize={13} marginLeft={8} >
                  {costume.costumeName}
                </Text>
              </Box>
              <Box position='absolute' right={8}>
                <Text flex={1} fontSize={12} color='#777'>
                  <FontAwesome name="star" size={12} color="#FFE81A" /> {costume.averageRating}
                </Text>
              </Box>
            </HStack>
            <Text marginLeft={8} fontSize={14} marginTop={5} marginBottom={5} fontWeight='bold'>Rp {costume.rentalPrice},- / Hari</Text>
            <Text fontSize={13} color={'#777'} paddingHorizontal={8} marginBottom={5}>{costume.username}</Text>
          </Box>
        </Box>
      </Pressable>
    ) : null;
  };


  return (
    <Box>
      <ScrollView bgColor='#f5f5f5'>
        <HeaderKatalog searchText={searchText} setSearchText={setSearchText} />
        <MasonryList
          data={costume}
          keyExtractor={item => item.costumeId}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <ItemKu costume={item} />}
          onRefresh={() => refetch({ first: ITEM_CNT })}
          onEndReachedThreshold={0.1}
          onEndReached={() => loadNext(ITEM_CNT)}
          style={{ marginBottom: 100 }}
        />
      </ScrollView>
    </Box>

  );
};

export default Katalog;