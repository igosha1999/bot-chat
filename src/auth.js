import {Telegraf} from "telegraf";
import admin from "firebase-admin";
import serviceAccount from '../config/serviceKey.json' assert {type: 'json'};

class Auth {

    constructor() {

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }


    saveUserToken(user, token) {
        const db = admin.firestore();
        const docRef = db.collection('users');
        docRef.add({user, token})
            .then(() => {
                console.log('Дані успішно додано до бази даних');
            })
            .catch((error) => {
                console.error('Сталася помилка при додаванні даних:', error);
            });
    }

    async getUserByToken(id) {
        try {
            const db = admin.firestore();
            const usersRef = db.collection('users');
            const querySnapshot = await usersRef.where('user.id', '==', id).get();

            if (querySnapshot.empty) {
                return null;
            }
            const userDoc = querySnapshot.docs[0];
            return userDoc.data();
        } catch (error) {
            console.log('Помилка при отриманні користувача з бази даних:', error);
            return null;
        }
    }
}

export const auth = new Auth();
